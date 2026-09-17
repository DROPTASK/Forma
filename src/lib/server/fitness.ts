import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  computeStreak,
  mapBlock,
  mapBody,
  mapChallengeRow,
  mapDaily,
  mapDiet,
  mapExercise,
  mapFood,
  mapMeal,
  mapProfile,
  mapSession,
  mapSet,
  mapTodo,
  mapWeight,
} from "@/lib/server/mappers";
import type {
  BodySnapshot,
  Challenge,
  DietPlanJson,
  MealType,
  Profile,
  ProposedAction,
} from "@/lib/types";
import { isoDate, num, todayISO, uid } from "@/lib/utils";

type Row = Record<string, unknown>;

async function ensureProfile(userId: string) {
  const sql = await getSql();
  const existing = await sql`select * from profiles where user_id = ${userId} limit 1`;
  if (existing[0]) return mapProfile(existing[0]);
  await sql`insert into profiles (user_id) values (${userId}) on conflict (user_id) do nothing`;
  const rows = await sql`select * from profiles where user_id = ${userId} limit 1`;
  return mapProfile(rows[0] ?? { user_id: userId });
}

export const getProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => ensureProfile(context.userId));

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((p: Partial<Profile> & { onboardingComplete?: boolean }) => p)
  .handler(async ({ context, data }) => {
    await ensureProfile(context.userId);
    const sql = await getSql();
    const cur = await sql`select * from profiles where user_id = ${context.userId} limit 1`;
    const p = mapProfile(cur[0] ?? { user_id: context.userId });
    const n = { ...p, ...data };
    await sql`
      update profiles set
        display_name = ${n.displayName},
        height_cm = ${n.heightCm},
        sex = ${n.sex},
        birth_year = ${n.birthYear},
        activity_level = ${n.activityLevel},
        goal_type = ${n.goalType},
        goal_weight_kg = ${n.goalWeightKg},
        goal_weight_high_kg = ${n.goalWeightHighKg},
        calorie_goal = ${n.calorieGoal},
        protein_goal = ${n.proteinGoal},
        carbs_goal = ${n.carbsGoal},
        fat_goal = ${n.fatGoal},
        unit_pref = ${n.unitPref},
        theme_pref = ${n.themePref},
        onboarding_complete = ${n.onboardingComplete},
        quiet_hours_start = ${n.quietHoursStart},
        quiet_hours_end = ${n.quietHoursEnd},
        notifications_enabled = ${n.notificationsEnabled},
        updated_at = now()
      where user_id = ${context.userId}
    `;
    return ensureProfile(context.userId);
  });

export const listExercises = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`
      select * from exercises
      where user_id is null or user_id = ${context.userId}
      order by is_custom, name
    `;
    return rows.map(mapExercise);
  });

export const createExercise = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; muscleGroups: string[]; equipment: string; instructions?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = uid();
    await sql`
      insert into exercises (id, user_id, name, muscle_groups, equipment, is_custom, instructions)
      values (${id}, ${context.userId}, ${data.name}, ${data.muscleGroups}, ${data.equipment}, true, ${data.instructions ?? null})
    `;
    return { id };
  });

export const listSessions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`
      select s.*,
        coalesce((select count(*) from set_logs l where l.session_id = s.id), 0) as set_count,
        coalesce((select sum(coalesce(l.weight_kg,0) * coalesce(l.reps,0)) from set_logs l where l.session_id = s.id), 0) as volume
      from workout_sessions s
      where s.user_id = ${context.userId}
      order by s.date desc, s.created_at desc
      limit 60
    `;
    return rows.map(mapSession);
  });

export const getSessionDetail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const sess = await sql`
      select s.*,
        coalesce((select count(*) from set_logs l where l.session_id = s.id), 0) as set_count,
        coalesce((select sum(coalesce(l.weight_kg,0) * coalesce(l.reps,0)) from set_logs l where l.session_id = s.id), 0) as volume
      from workout_sessions s
      where s.id = ${data.id} and s.user_id = ${context.userId}
      limit 1
    `;
    if (!sess[0]) return null;
    const sets = await sql`
      select * from set_logs where session_id = ${data.id} and user_id = ${context.userId}
      order by created_at
    `;
    return { session: mapSession(sess[0]), sets: sets.map(mapSet) };
  });

export const createSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title?: string; date?: string; notes?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = uid();
    const date = data.date || todayISO();
    await sql`
      insert into workout_sessions (id, user_id, date, title, start_time, notes)
      values (${id}, ${context.userId}, ${date}::date, ${data.title ?? "Workout"}, now(), ${data.notes ?? null})
    `;
    return { id, date };
  });

export const finishSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; notes?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update workout_sessions set end_time = now(), notes = coalesce(${data.notes ?? null}, notes)
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const addSet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      sessionId: string;
      exerciseId: string;
      exerciseName: string;
      muscleGroups: string[];
      setNumber: number;
      reps?: number | null;
      weightKg?: number | null;
      rpe?: number | null;
      restSeconds?: number | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const own = await sql`select id from workout_sessions where id = ${data.sessionId} and user_id = ${context.userId}`;
    if (!own[0]) throw new Error("Session not found");
    const id = uid();
    await sql`
      insert into set_logs (
        id, user_id, session_id, exercise_id, exercise_name, muscle_groups,
        set_number, reps, weight_kg, rpe, rest_seconds
      ) values (
        ${id}, ${context.userId}, ${data.sessionId}, ${data.exerciseId}, ${data.exerciseName}, ${data.muscleGroups},
        ${data.setNumber}, ${data.reps ?? null}, ${data.weightKg ?? null}, ${data.rpe ?? null}, ${data.restSeconds ?? null}
      )
    `;
    return { id };
  });

export const deleteSet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from set_logs where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const getExerciseHistory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { exerciseId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      select l.*, s.date
      from set_logs l
      join workout_sessions s on s.id = l.session_id
      where l.user_id = ${context.userId} and l.exercise_id = ${data.exerciseId}
      order by s.date, l.created_at
    `;
    return rows.map((r) => ({ ...mapSet(r), date: isoDate(r.date) }));
  });

export const getMuscleVolume = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`
      select unnest(l.muscle_groups) as muscle,
        sum(coalesce(l.weight_kg, 0) * coalesce(l.reps, 0)) as volume
      from set_logs l
      join workout_sessions s on s.id = l.session_id
      where l.user_id = ${context.userId} and s.date >= (current_date - interval '7 days')
      group by 1
    `;
    const out: Record<string, number> = {};
    for (const r of rows) out[String(r.muscle)] = num(r.volume);
    return out;
  });

export const searchFoods = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { q: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const q = `%${data.q.trim().toLowerCase()}%`;
    const rows = await sql`
      select * from foods
      where (user_id is null or user_id = ${context.userId})
        and lower(name) like ${q}
      order by name
      limit 30
    `;
    return rows.map(mapFood);
  });

export const addMeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      date?: string;
      mealType: MealType;
      foodId?: string | null;
      foodName: string;
      quantityG: number;
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      aiParsed?: boolean;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = uid();
    const date = data.date || todayISO();
    await sql`
      insert into meal_entries (
        id, user_id, date, meal_type, food_id, food_name, quantity_g,
        calories, protein_g, carbs_g, fat_g, ai_parsed
      ) values (
        ${id}, ${context.userId}, ${date}::date, ${data.mealType}, ${data.foodId ?? null}, ${data.foodName},
        ${data.quantityG}, ${data.calories}, ${data.proteinG}, ${data.carbsG}, ${data.fatG}, ${data.aiParsed ?? false}
      )
    `;
    return { id };
  });

export const deleteMeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from meal_entries where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const listMeals = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { date: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      select * from meal_entries
      where user_id = ${context.userId} and date = ${data.date}::date
      order by created_at
    `;
    return rows.map(mapMeal);
  });

export const addWeight = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      date?: string;
      valueKg: number;
      source?: "manual" | "ble";
      bodyFatPct?: number | null;
      deviceName?: string | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = uid();
    const date = data.date || todayISO();
    await sql`
      insert into weight_entries (id, user_id, date, value_kg, source, body_fat_pct, device_name)
      values (${id}, ${context.userId}, ${date}::date, ${data.valueKg}, ${data.source ?? "manual"}, ${data.bodyFatPct ?? null}, ${data.deviceName ?? null})
    `;
    return { id };
  });

export const listWeight = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`
      select * from weight_entries where user_id = ${context.userId}
      order by date, logged_at
      limit 400
    `;
    return rows.map(mapWeight);
  });

export const deleteWeight = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from weight_entries where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const listChallenges = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const ch = await sql`select * from challenges where user_id = ${context.userId} order by created_at desc`;
    const checks = await sql`select challenge_id, date, completed from check_ins where user_id = ${context.userId}`;
    const today = todayISO();
    const byCh = new Map<string, string[]>();
    for (const c of checks) {
      if (!c.completed) continue;
      const id = String(c.challenge_id);
      const list = byCh.get(id) ?? [];
      list.push(isoDate(c.date));
      byCh.set(id, list);
    }
    return ch.map((row) => {
      const base = mapChallengeRow(row);
      const dates = byCh.get(base.id) ?? [];
      const { current, longest } = computeStreak(dates, today, base.graceEnabled);
      const completionPct = Math.min(100, Math.round((dates.length / Math.max(1, base.targetDays)) * 100));
      const result: Challenge = {
        ...base,
        currentStreak: current,
        longestStreak: longest,
        checkedInToday: dates.includes(today),
        completionPct,
        checkIns: dates,
      };
      return result;
    });
  });

export const createChallenge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      title: string;
      type?: "streak" | "duration";
      targetDays: number;
      dailyTask?: string;
      graceEnabled?: boolean;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = uid();
    await sql`
      insert into challenges (id, user_id, title, type, target_days, start_date, daily_task, grace_enabled)
      values (${id}, ${context.userId}, ${data.title}, ${data.type ?? "streak"}, ${data.targetDays}, ${todayISO()}::date, ${data.dailyTask ?? null}, ${data.graceEnabled ?? false})
    `;
    return { id };
  });

export const checkInChallenge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; date?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const own = await sql`select id from challenges where id = ${data.id} and user_id = ${context.userId}`;
    if (!own[0]) throw new Error("Not found");
    const date = data.date || todayISO();
    const id = uid();
    await sql`
      insert into check_ins (id, user_id, challenge_id, date, completed)
      values (${id}, ${context.userId}, ${data.id}, ${date}::date, true)
      on conflict (challenge_id, date) do update set completed = true
    `;
    return { ok: true };
  });

export const deleteChallenge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from check_ins where challenge_id = ${data.id} and user_id = ${context.userId}`;
    await sql`delete from challenges where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const listTodos = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`select * from todos where user_id = ${context.userId} order by done, created_at desc`;
    return rows.map(mapTodo);
  });

export const addTodo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { title: string; notes?: string; dueAt?: string | null }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = uid();
    await sql`
      insert into todos (id, user_id, title, notes, due_at)
      values (${id}, ${context.userId}, ${data.title}, ${data.notes ?? null}, ${data.dueAt ?? null})
    `;
    return { id };
  });

export const toggleTodo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; done: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`update todos set done = ${data.done} where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const deleteTodo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from todos where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const listBlocks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`select * from timetable_blocks where user_id = ${context.userId} order by start_time`;
    return rows.map(mapBlock);
  });

export const saveBlock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      id?: string;
      dayOfWeek?: number | null;
      specificDate?: string | null;
      startTime: string;
      endTime: string;
      title: string;
      category: string;
      reminderMinutes?: number | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = data.id || uid();
    await sql.query(
      `insert into timetable_blocks
        (id, user_id, day_of_week, specific_date, start_time, end_time, title, category, reminder_minutes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) do update set
         day_of_week = excluded.day_of_week,
         specific_date = excluded.specific_date,
         start_time = excluded.start_time,
         end_time = excluded.end_time,
         title = excluded.title,
         category = excluded.category,
         reminder_minutes = excluded.reminder_minutes
       where timetable_blocks.user_id = $2`,
      [
        id,
        context.userId,
        data.dayOfWeek ?? null,
        data.specificDate ?? null,
        data.startTime,
        data.endTime,
        data.title,
        data.category,
        data.reminderMinutes ?? null,
      ],
    );
    return { id };
  });

export const deleteBlock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from timetable_blocks where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true };
  });

export const getDaily = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { date: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      select * from daily_records where user_id = ${context.userId} and date = ${data.date}::date
    `;
    return rows[0] ? mapDaily(rows[0]) : { date: data.date, mood: null, notes: null, aiSummary: null };
  });

export const saveDaily = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { date: string; mood?: number | null; notes?: string | null; aiSummary?: string | null }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql.query(
      `insert into daily_records (user_id, date, mood, notes, ai_summary)
       values ($1,$2,$3,$4,$5)
       on conflict (user_id, date) do update set
         mood = coalesce($3, daily_records.mood),
         notes = coalesce($4, daily_records.notes),
         ai_summary = coalesce($5, daily_records.ai_summary),
         updated_at = now()`,
      [context.userId, data.date, data.mood ?? null, data.notes ?? null, data.aiSummary ?? null],
    );
    return { ok: true };
  });

export const saveDietPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      title: string;
      goalType?: string;
      calorieTarget?: number;
      dietType?: string;
      restrictions?: string;
      mealsPerDay?: number;
      plan: DietPlanJson;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = uid();
    await sql.query(
      `insert into diet_plans (id, user_id, title, goal_type, calorie_target, diet_type, restrictions, meals_per_day, plan_json)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [
        id,
        context.userId,
        data.title,
        data.goalType ?? null,
        data.calorieTarget ?? null,
        data.dietType ?? null,
        data.restrictions ?? null,
        data.mealsPerDay ?? null,
        JSON.stringify(data.plan),
      ],
    );
    return { id };
  });

export const listDietPlans = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`select * from diet_plans where user_id = ${context.userId} order by created_at desc`;
    return rows.map(mapDiet);
  });

export const addBodySnapshot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: Omit<BodySnapshot, "id">) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = uid();
    await sql`
      insert into body_snapshots (
        id, user_id, date, height_used_cm, shoulder_width_cm, arm_length_l_cm, arm_length_r_cm,
        torso_length_cm, leg_length_l_cm, leg_length_r_cm, hip_width_cm,
        estimated_waist_width_cm, estimated_chest_width_cm, notes
      ) values (
        ${id}, ${context.userId}, ${data.date}::date, ${data.heightUsedCm}, ${data.shoulderWidthCm},
        ${data.armLengthLCm}, ${data.armLengthRCm}, ${data.torsoLengthCm}, ${data.legLengthLCm},
        ${data.legLengthRCm}, ${data.hipWidthCm}, ${data.estimatedWaistWidthCm}, ${data.estimatedChestWidthCm},
        ${data.notes}
      )
    `;
    return { id };
  });

export const listBodySnapshots = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`select * from body_snapshots where user_id = ${context.userId} order by date`;
    return rows.map(mapBody);
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(context.userId);
    const today = todayISO();
    const meals = (await sql`select * from meal_entries where user_id = ${context.userId} and date = ${today}::date`).map(mapMeal);
    const sessions = await sql`
      select s.*,
        coalesce((select count(*) from set_logs l where l.session_id = s.id), 0) as set_count,
        coalesce((select sum(coalesce(l.weight_kg,0) * coalesce(l.reps,0)) from set_logs l where l.session_id = s.id), 0) as volume
      from workout_sessions s
      where s.user_id = ${context.userId} and s.date = ${today}::date
    `;
    const weights = await sql`
      select * from weight_entries where user_id = ${context.userId} order by date desc, logged_at desc limit 30
    `;
    const trend = await sql`
      select date, (array_agg(value_kg order by logged_at desc))[1] as value_kg
      from weight_entries where user_id = ${context.userId}
      group by date order by date
      limit 90
    `;
    const challenges = await sql`select * from challenges where user_id = ${context.userId}`;
    const checks = await sql`select challenge_id, date from check_ins where user_id = ${context.userId} and completed = true`;
    const todos = await sql`select * from todos where user_id = ${context.userId} and done = false order by created_at desc limit 8`;
    const blocks = await sql`select * from timetable_blocks where user_id = ${context.userId}`;
    const dailyRows = await sql`select * from daily_records where user_id = ${context.userId} and date = ${today}::date`;
    const volume7 = await sql`
      select coalesce(sum(coalesce(l.weight_kg,0) * coalesce(l.reps,0)),0) as volume
      from set_logs l
      join workout_sessions s on s.id = l.session_id
      where l.user_id = ${context.userId} and s.date >= (current_date - interval '7 days')
    `;
    const workoutDays = await sql`
      select count(distinct date) as n from workout_sessions
      where user_id = ${context.userId} and date >= (current_date - interval '30 days')
    `;

    const cal = meals.reduce((a, m) => a + m.calories, 0);
    const protein = meals.reduce((a, m) => a + m.proteinG, 0);
    const carbs = meals.reduce((a, m) => a + m.carbsG, 0);
    const fat = meals.reduce((a, m) => a + m.fatG, 0);

    const checkMap = new Map<string, string[]>();
    for (const c of checks) {
      const id = String(c.challenge_id);
      const list = checkMap.get(id) ?? [];
      list.push(isoDate(c.date));
      checkMap.set(id, list);
    }
    const challengeCards = challenges.map((row) => {
      const base = mapChallengeRow(row);
      const dates = checkMap.get(base.id) ?? [];
      const { current } = computeStreak(dates, today, base.graceEnabled);
      return {
        id: base.id,
        title: base.title,
        streak: current,
        checkedInToday: dates.includes(today),
      };
    });

    const dow = new Date().getDay();
    const todayBlocks = blocks
      .map(mapBlock)
      .filter((b) => b.dayOfWeek === dow || b.specificDate === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return {
      profile,
      today,
      calories: cal,
      protein,
      carbs,
      fat,
      meals,
      sessions: sessions.map(mapSession),
      latestWeight: weights[0] ? mapWeight(weights[0]) : null,
      weightTrend: trend.map((r) => ({ date: isoDate(r.date), kg: num(r.value_kg) })),
      challenges: challengeCards,
      todos: todos.map(mapTodo),
      blocks: todayBlocks,
      daily: dailyRows[0] ? mapDaily(dailyRows[0]) : null,
      weeklyVolume: num(volume7[0]?.volume),
      workoutDays30: num(workoutDays[0]?.n),
    };
  });

export const seedSampleWeek = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureProfile(context.userId);
    const existing = await sql`select id from workout_sessions where user_id = ${context.userId} limit 1`;
    if (existing[0]) return { ok: true };
    const today = todayISO();
    const mkDate = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return todayISO(d);
    };

    const sid = uid();
    await sql`
      insert into workout_sessions (id, user_id, date, title, start_time, end_time)
      values (${sid}, ${context.userId}, ${today}::date, ${"Push Day"}, now() - interval '70 minutes', now())
    `;
    const sets: [string, string, string[], number, number, number][] = [
      ["ex-bench-press", "Barbell Bench Press", ["chest", "shoulders", "triceps"], 1, 8, 60],
      ["ex-bench-press", "Barbell Bench Press", ["chest", "shoulders", "triceps"], 2, 8, 60],
      ["ex-bench-press", "Barbell Bench Press", ["chest", "shoulders", "triceps"], 3, 6, 65],
      ["ex-ohp", "Overhead Press", ["shoulders", "triceps"], 1, 8, 40],
      ["ex-ohp", "Overhead Press", ["shoulders", "triceps"], 2, 8, 40],
      ["ex-tricep-pushdown", "Tricep Pushdown", ["triceps"], 1, 12, 20],
    ];
    for (const s of sets) {
      await sql`
        insert into set_logs (id, user_id, session_id, exercise_id, exercise_name, muscle_groups, set_number, reps, weight_kg)
        values (${uid()}, ${context.userId}, ${sid}, ${s[0]}, ${s[1]}, ${s[2]}, ${s[3]}, ${s[4]}, ${s[5]})
      `;
    }

    await sql`
      insert into meal_entries (id, user_id, date, meal_type, food_name, quantity_g, calories, protein_g, carbs_g, fat_g)
      values
        (${uid()}, ${context.userId}, ${today}::date, ${"breakfast"}, ${"Oats with whey and banana"}, ${120}, ${420}, ${32}, ${58}, ${8}),
        (${uid()}, ${context.userId}, ${today}::date, ${"lunch"}, ${"Chicken breast with rice"}, ${350}, ${610}, ${52}, ${62}, ${12}),
        (${uid()}, ${context.userId}, ${today}::date, ${"snack"}, ${"Greek yogurt"}, ${200}, ${194}, ${18}, ${7}, ${10})
    `;

    for (let i = 14; i >= 0; i--) {
      const date = mkDate(-i);
      const kg = 72.4 - i * 0.05 + (i % 3) * 0.12;
      await sql`
        insert into weight_entries (id, user_id, date, value_kg, source)
        values (${uid()}, ${context.userId}, ${date}::date, ${Math.round(kg * 10) / 10}, ${"manual"})
      `;
    }

    const cid = uid();
    await sql`
      insert into challenges (id, user_id, title, type, target_days, start_date, daily_task)
      values (${cid}, ${context.userId}, ${"Workout streak"}, ${"streak"}, ${30}, ${mkDate(-6)}::date, ${"Train at least 30 minutes"})
    `;
    for (let i = 6; i >= 0; i--) {
      if (i === 2) continue;
      await sql`
        insert into check_ins (id, user_id, challenge_id, date, completed)
        values (${uid()}, ${context.userId}, ${cid}, ${mkDate(-i)}::date, true)
      `;
    }

    await sql`
      insert into todos (id, user_id, title, notes)
      values (${uid()}, ${context.userId}, ${"Buy whey protein"}, ${"2 kg unflavoured"})
    `;

    const blocks: [number, string, string, string, string][] = [
      [1, "06:30", "07:30", "Gym — Push", "workout"],
      [3, "06:30", "07:30", "Gym — Pull", "workout"],
      [5, "06:30", "07:30", "Gym — Legs", "workout"],
      [0, "08:00", "08:30", "Breakfast", "meal"],
      [1, "08:00", "08:30", "Breakfast", "meal"],
      [2, "08:00", "08:30", "Breakfast", "meal"],
      [3, "08:00", "08:30", "Breakfast", "meal"],
      [4, "08:00", "08:30", "Breakfast", "meal"],
      [5, "08:00", "08:30", "Breakfast", "meal"],
      [6, "08:00", "08:30", "Breakfast", "meal"],
    ];
    for (const b of blocks) {
      await sql`
        insert into timetable_blocks (id, user_id, day_of_week, start_time, end_time, title, category)
        values (${uid()}, ${context.userId}, ${b[0]}, ${b[1]}, ${b[2]}, ${b[3]}, ${b[4]})
      `;
    }

    await sql`
      update profiles set
        height_cm = coalesce(height_cm, 170),
        goal_weight_kg = coalesce(goal_weight_kg, 68),
        calorie_goal = 2200,
        onboarding_complete = true,
        updated_at = now()
      where user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const saveBleDevice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; deviceId?: string; kind?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = uid();
    await sql`
      insert into ble_devices (id, user_id, name, device_id, kind, last_seen)
      values (${id}, ${context.userId}, ${data.name}, ${data.deviceId ?? null}, ${data.kind ?? "scale"}, now())
    `;
    return { id };
  });

export const listAiHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`
      select * from ai_messages where user_id = ${context.userId}
      order by created_at
      limit 80
    `;
    return rows.map((r: Row) => ({
      id: String(r.id),
      role: (String(r.role) === "user" ? "user" : "assistant") as "user" | "assistant",
      content: String(r.content),
      actions: (r.tool_payload
        ? ((typeof r.tool_payload === "string" ? JSON.parse(String(r.tool_payload)) : r.tool_payload) as ProposedAction[])
        : []) as ProposedAction[],
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ""),
    }));
  });

export const clearAiHistory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`delete from ai_messages where user_id = ${context.userId}`;
    return { ok: true };
  });
