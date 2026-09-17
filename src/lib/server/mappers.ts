import { isoDate, num } from "@/lib/utils";
import type {
  BodySnapshot,
  Challenge,
  DailyRecord,
  DietPlan,
  DietPlanJson,
  Exercise,
  Food,
  MealEntry,
  MealType,
  Profile,
  SetLog,
  TimetableBlock,
  TodoItem,
  WeightEntry,
  WorkoutSession,
} from "@/lib/types";

type Row = Record<string, unknown>;

function str(v: unknown): string {
  return v == null ? "" : String(v);
}
function strNull(v: unknown): string | null {
  return v == null ? null : String(v);
}
function numNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = num(v, Number.NaN);
  return Number.isFinite(n) ? n : null;
}
function bool(v: unknown): boolean {
  return v === true || v === "t" || v === "true";
}
function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  return [];
}

export function mapProfile(r: Row): Profile {
  return {
    userId: str(r.user_id),
    displayName: strNull(r.display_name),
    heightCm: numNull(r.height_cm),
    sex: strNull(r.sex),
    birthYear: numNull(r.birth_year),
    activityLevel: str(r.activity_level) || "moderate",
    goalType: (str(r.goal_type) as Profile["goalType"]) || "maintain",
    goalWeightKg: numNull(r.goal_weight_kg),
    goalWeightHighKg: numNull(r.goal_weight_high_kg),
    calorieGoal: num(r.calorie_goal, 2200),
    proteinGoal: num(r.protein_goal, 160),
    carbsGoal: num(r.carbs_goal, 220),
    fatGoal: num(r.fat_goal, 70),
    unitPref: str(r.unit_pref) === "lb" ? "lb" : "kg",
    themePref:
      str(r.theme_pref) === "light" || str(r.theme_pref) === "dark"
        ? (str(r.theme_pref) as Profile["themePref"])
        : "system",
    onboardingComplete: bool(r.onboarding_complete),
    quietHoursStart: strNull(r.quiet_hours_start),
    quietHoursEnd: strNull(r.quiet_hours_end),
    notificationsEnabled: r.notifications_enabled == null ? true : bool(r.notifications_enabled),
  };
}

export function mapExercise(r: Row): Exercise {
  return {
    id: str(r.id),
    name: str(r.name),
    muscleGroups: arr(r.muscle_groups),
    equipment: str(r.equipment) || "none",
    isCustom: bool(r.is_custom),
    instructions: strNull(r.instructions),
  };
}

export function mapSession(r: Row): WorkoutSession {
  return {
    id: str(r.id),
    date: isoDate(r.date),
    title: strNull(r.title),
    startTime: r.start_time instanceof Date ? r.start_time.toISOString() : strNull(r.start_time),
    endTime: r.end_time instanceof Date ? r.end_time.toISOString() : strNull(r.end_time),
    notes: strNull(r.notes),
    setCount: num(r.set_count),
    volume: num(r.volume),
  };
}

export function mapSet(r: Row): SetLog {
  return {
    id: str(r.id),
    sessionId: str(r.session_id),
    exerciseId: str(r.exercise_id),
    exerciseName: str(r.exercise_name),
    muscleGroups: arr(r.muscle_groups),
    setNumber: num(r.set_number, 1),
    reps: numNull(r.reps),
    weightKg: numNull(r.weight_kg),
    rpe: numNull(r.rpe),
    restSeconds: numNull(r.rest_seconds),
  };
}

export function mapFood(r: Row): Food {
  return {
    id: str(r.id),
    name: str(r.name),
    caloriesPer100g: num(r.calories_per_100g),
    proteinG: num(r.protein_g),
    carbsG: num(r.carbs_g),
    fatG: num(r.fat_g),
    source: str(r.source) || "local",
  };
}

export function mapMeal(r: Row): MealEntry {
  return {
    id: str(r.id),
    date: isoDate(r.date),
    mealType: (str(r.meal_type) as MealType) || "snack",
    foodId: strNull(r.food_id),
    foodName: str(r.food_name),
    quantityG: num(r.quantity_g),
    calories: num(r.calories),
    proteinG: num(r.protein_g),
    carbsG: num(r.carbs_g),
    fatG: num(r.fat_g),
    aiParsed: bool(r.ai_parsed),
  };
}

export function mapWeight(r: Row): WeightEntry {
  return {
    id: str(r.id),
    date: isoDate(r.date),
    valueKg: num(r.value_kg),
    source: str(r.source) === "ble" ? "ble" : "manual",
    bodyFatPct: numNull(r.body_fat_pct),
    deviceName: strNull(r.device_name),
    loggedAt:
      r.logged_at instanceof Date ? r.logged_at.toISOString() : str(r.logged_at) || new Date().toISOString(),
  };
}

export function mapTodo(r: Row): TodoItem {
  return {
    id: str(r.id),
    title: str(r.title),
    notes: strNull(r.notes),
    dueAt: r.due_at instanceof Date ? r.due_at.toISOString() : strNull(r.due_at),
    remindAt: r.remind_at instanceof Date ? r.remind_at.toISOString() : strNull(r.remind_at),
    done: bool(r.done),
  };
}

export function mapBlock(r: Row): TimetableBlock {
  return {
    id: str(r.id),
    dayOfWeek: numNull(r.day_of_week),
    specificDate: r.specific_date ? isoDate(r.specific_date) : null,
    startTime: str(r.start_time),
    endTime: str(r.end_time),
    title: str(r.title),
    category: (str(r.category) as TimetableBlock["category"]) || "other",
    reminderMinutes: numNull(r.reminder_minutes),
  };
}

export function mapDaily(r: Row): DailyRecord {
  return {
    date: isoDate(r.date),
    mood: numNull(r.mood),
    notes: strNull(r.notes),
    aiSummary: strNull(r.ai_summary),
  };
}

export function mapBody(r: Row): BodySnapshot {
  return {
    id: str(r.id),
    date: isoDate(r.date),
    heightUsedCm: num(r.height_used_cm),
    shoulderWidthCm: numNull(r.shoulder_width_cm),
    armLengthLCm: numNull(r.arm_length_l_cm),
    armLengthRCm: numNull(r.arm_length_r_cm),
    torsoLengthCm: numNull(r.torso_length_cm),
    legLengthLCm: numNull(r.leg_length_l_cm),
    legLengthRCm: numNull(r.leg_length_r_cm),
    hipWidthCm: numNull(r.hip_width_cm),
    estimatedWaistWidthCm: numNull(r.estimated_waist_width_cm),
    estimatedChestWidthCm: numNull(r.estimated_chest_width_cm),
    notes: strNull(r.notes),
  };
}

export function mapDiet(r: Row): DietPlan {
  const raw = r.plan_json;
  const plan = (typeof raw === "string" ? JSON.parse(raw) : raw) as DietPlanJson;
  return {
    id: str(r.id),
    title: str(r.title),
    goalType: strNull(r.goal_type),
    calorieTarget: numNull(r.calorie_target),
    dietType: strNull(r.diet_type),
    restrictions: strNull(r.restrictions),
    mealsPerDay: numNull(r.meals_per_day),
    plan,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : str(r.created_at),
  };
}

export function mapChallengeRow(r: Row): Omit<Challenge, "currentStreak" | "longestStreak" | "checkedInToday" | "completionPct" | "checkIns"> {
  return {
    id: str(r.id),
    title: str(r.title),
    type: str(r.type) === "duration" ? "duration" : "streak",
    targetDays: num(r.target_days, 30),
    startDate: isoDate(r.start_date),
    endDate: r.end_date ? isoDate(r.end_date) : null,
    dailyTask: strNull(r.daily_task),
    graceEnabled: bool(r.grace_enabled),
  };
}

export function computeStreak(dates: string[], today: string, grace: boolean) {
  const set = new Set(dates);
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (!prev) run = 1;
    else {
      const gap = (Date.parse(d) - Date.parse(prev)) / 86400000;
      run = gap === 1 || (grace && gap === 2) ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }
  let current = 0;
  let cursor = today;
  if (!set.has(today)) {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    cursor = y.toISOString().slice(0, 10);
    if (!set.has(cursor) && grace) {
      y.setDate(y.getDate() - 1);
      cursor = y.toISOString().slice(0, 10);
    }
  }
  while (set.has(cursor)) {
    current += 1;
    const dt = new Date(cursor);
    dt.setDate(dt.getDate() - 1);
    cursor = dt.toISOString().slice(0, 10);
  }
  return { current, longest };
}
