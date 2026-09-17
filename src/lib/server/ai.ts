import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { AI_TOOLS, summarizeAction } from "@/lib/ai/tools";
import type { DietPlanJson, JsonValue, ProposedAction } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

const lastCall = new Map<string, number>();

export const askAi = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (d: {
      message: string;
      context?: string;
      toolNames?: string[];
      history?: { role: "user" | "assistant"; content: string }[];
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI is not available in this environment" };
    }
    const now = Date.now();
    const prev = lastCall.get(context.userId) ?? 0;
    if (now - prev < 800) {
      return { ok: false as const, error: "Give it a moment before asking again." };
    }
    lastCall.set(context.userId, now);

    const tools =
      data.toolNames && data.toolNames.length
        ? AI_TOOLS.filter((t) => data.toolNames!.includes(t.function.name))
        : AI_TOOLS;

    const messages: ChatMsg[] = [
      {
        role: "system",
        content:
          "You are Forma, a concise fitness coach inside a tracking app. " +
          "Prefer calling tools to log or create data rather than only talking. " +
          "Nutrition numbers are estimates. Never claim medical accuracy. " +
          "Keep replies short. If you call tools, also write a one-line confirmation of what you proposed. " +
          (data.context ? `Context:\n${data.context}` : ""),
      },
      ...(data.history ?? []).slice(-8),
      { role: "user", content: data.message.slice(0, 4000) },
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // Groq's OpenAI-compatible endpoint. llama-3.3-70b-versatile was
        // decommissioned by Groq (Aug 16, 2026); gpt-oss-120b is their
        // recommended replacement and also supports tool calling. Swap
        // freely for any other tool-capable Groq model (see
        // console.groq.com/docs/models) — response shape stays the same.
        model: "openai/gpt-oss-120b",
        messages,
        tools,
        max_tokens: 1200,
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      return { ok: false as const, error: `AI error ${res.status}` };
    }
    const body = (await res.json()) as {
      choices: {
        message: {
          content?: string | null;
          tool_calls?: { id: string; function: { name: string; arguments: string } }[];
        };
      }[];
    };
    const msg = body.choices[0]?.message;
    const text = (msg?.content ?? "").trim();
    const actions: ProposedAction[] = [];
    for (const call of (msg?.tool_calls ?? []).slice(0, 5)) {
      let args: { [key: string]: JsonValue } = {};
      try {
        args = JSON.parse(call.function.arguments || "{}") as { [key: string]: JsonValue };
      } catch {
        args = {};
      }
      actions.push({
        id: call.id || uid(),
        name: call.function.name,
        args,
        summary: summarizeAction(call.function.name, args),
      });
    }

    const sql = await getSql();
    await sql.query(`insert into ai_messages (id, user_id, role, content) values ($1,$2,'user',$3)`, [
      uid(),
      context.userId,
      data.message,
    ]);
    await sql.query(
      `insert into ai_messages (id, user_id, role, content, tool_payload) values ($1,$2,'assistant',$3,$4::jsonb)`,
      [uid(), context.userId, text || (actions.length ? "I have a few actions ready." : ""), JSON.stringify(actions)],
    );

    return { ok: true as const, text: text || (actions.length ? "Confirm the actions below." : "Done."), actions };
  });

export const executeAiActions = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { actions: ProposedAction[] }) => d)
  .handler(async ({ context, data }) => {
    const results: { id: string; ok: boolean; detail: string }[] = [];
    for (const action of data.actions.slice(0, 5)) {
      try {
        const detail = await runAction(context.userId, action);
        results.push({ id: action.id, ok: true, detail });
      } catch (e) {
        results.push({
          id: action.id,
          ok: false,
          detail: e instanceof Error ? e.message : "Failed",
        });
      }
    }
    return { results };
  });

async function runAction(userId: string, action: ProposedAction): Promise<string> {
  const sql = await getSql();
  const a = action.args;
  switch (action.name) {
    case "addMeal": {
      await sql`
        insert into meal_entries (
          id, user_id, date, meal_type, food_name, quantity_g, calories, protein_g, carbs_g, fat_g, ai_parsed
        ) values (
          ${uid()}, ${userId}, ${todayISO()}::date, ${String(a.mealType)}, ${String(a.foodName)},
          ${Number(a.quantityG) || 100}, ${Number(a.calories) || 0}, ${Number(a.proteinG) || 0},
          ${Number(a.carbsG) || 0}, ${Number(a.fatG) || 0}, true
        )
      `;
      return "Meal logged";
    }
    case "addWorkout": {
      const id = uid();
      await sql`
        insert into workout_sessions (id, user_id, date, title, start_time, notes)
        values (${id}, ${userId}, ${todayISO()}::date, ${String(a.title)}, now(), ${a.notes ? String(a.notes) : null})
      `;
      return `Workout started`;
    }
    case "logSet": {
      const sid = uid();
      await sql`
        insert into workout_sessions (id, user_id, date, title, start_time)
        values (${sid}, ${userId}, ${todayISO()}::date, ${"Quick log"}, now())
      `;
      const groups = Array.isArray(a.muscleGroups) ? a.muscleGroups.map(String) : [];
      await sql`
        insert into set_logs (id, user_id, session_id, exercise_id, exercise_name, muscle_groups, set_number, reps, weight_kg)
        values (
          ${uid()}, ${userId}, ${sid}, ${`ai-${String(a.exerciseName).slice(0, 24)}`}, ${String(a.exerciseName)},
          ${groups}, ${Number(a.setNumber) || 1}, ${a.reps != null ? Number(a.reps) : null}, ${a.weightKg != null ? Number(a.weightKg) : null}
        )
      `;
      return "Set logged";
    }
    case "logWeight":
      await sql`
        insert into weight_entries (id, user_id, date, value_kg, source, body_fat_pct)
        values (${uid()}, ${userId}, ${todayISO()}::date, ${Number(a.valueKg)}, ${"manual"}, ${a.bodyFatPct != null ? Number(a.bodyFatPct) : null})
      `;
      return "Weight logged";
    case "createChallenge":
      await sql`
        insert into challenges (id, user_id, title, type, target_days, start_date, daily_task)
        values (${uid()}, ${userId}, ${String(a.title)}, ${"streak"}, ${Number(a.targetDays) || 30}, ${todayISO()}::date, ${a.dailyTask ? String(a.dailyTask) : null})
      `;
      return "Challenge created";
    case "addTodo":
      await sql`
        insert into todos (id, user_id, title, notes)
        values (${uid()}, ${userId}, ${String(a.title)}, ${a.notes ? String(a.notes) : null})
      `;
      return "To-do added";
    case "scheduleTimetableBlock":
      await sql`
        insert into timetable_blocks (id, user_id, day_of_week, start_time, end_time, title, category)
        values (${uid()}, ${userId}, ${Number(a.dayOfWeek)}, ${String(a.startTime)}, ${String(a.endTime)}, ${String(a.title)}, ${String(a.category)})
      `;
      return "Block scheduled";
    case "generateDietPlan":
      await sql.query(
        `insert into diet_plans (id, user_id, title, goal_type, calorie_target, diet_type, restrictions, meals_per_day, plan_json)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
        [
          uid(),
          userId,
          String(a.title),
          a.goalType ? String(a.goalType) : null,
          a.calorieTarget != null ? Number(a.calorieTarget) : null,
          a.dietType ? String(a.dietType) : null,
          a.restrictions ? String(a.restrictions) : null,
          a.mealsPerDay != null ? Number(a.mealsPerDay) : null,
          JSON.stringify(a.plan as DietPlanJson),
        ],
      );
      return "Diet plan saved";
    case "summarizeDay":
      await sql.query(
        `insert into daily_records (user_id, date, ai_summary)
         values ($1,$2,$3)
         on conflict (user_id, date) do update set ai_summary = excluded.ai_summary, updated_at = now()`,
        [userId, todayISO(), String(a.summary)],
      );
      return "Recap saved";
    case "fillField":
      return String(a.value ?? "");
    case "playWorkoutMusic":
      return `music:${String(a.query)}`;
    default:
      return "Skipped";
  }
}
