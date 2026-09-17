export const AI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "addMeal",
      description: "Log a meal or food item with calories and macros. Use when the user describes food they ate.",
      parameters: {
        type: "object",
        properties: {
          mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
          foodName: { type: "string" },
          quantityG: { type: "number", description: "Portion in grams" },
          calories: { type: "number" },
          proteinG: { type: "number" },
          carbsG: { type: "number" },
          fatG: { type: "number" },
        },
        required: ["mealType", "foodName", "quantityG", "calories", "proteinG", "carbsG", "fatG"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "addWorkout",
      description: "Start or log a named workout session for today.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          notes: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "logSet",
      description: "Log a set onto the latest or a new workout session.",
      parameters: {
        type: "object",
        properties: {
          exerciseName: { type: "string" },
          muscleGroups: { type: "array", items: { type: "string" } },
          reps: { type: "number" },
          weightKg: { type: "number" },
          setNumber: { type: "number" },
        },
        required: ["exerciseName", "reps"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "logWeight",
      description: "Log a body-weight entry in kilograms.",
      parameters: {
        type: "object",
        properties: {
          valueKg: { type: "number" },
          bodyFatPct: { type: "number" },
        },
        required: ["valueKg"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "createChallenge",
      description: "Start a streak or duration challenge.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          targetDays: { type: "number" },
          dailyTask: { type: "string" },
        },
        required: ["title", "targetDays"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "addTodo",
      description: "Add a reminder or buy-stuff to-do.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          notes: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "scheduleTimetableBlock",
      description: "Add a recurring weekly timetable block. dayOfWeek is 0=Sun .. 6=Sat.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          category: { type: "string", enum: ["workout", "meal", "sleep", "other"] },
          dayOfWeek: { type: "number" },
          startTime: { type: "string", description: "HH:MM 24h" },
          endTime: { type: "string" },
        },
        required: ["title", "category", "dayOfWeek", "startTime", "endTime"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generateDietPlan",
      description: "Create a structured multi-day diet plan. Always include daily calorie/macro totals.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          goalType: { type: "string" },
          calorieTarget: { type: "number" },
          dietType: { type: "string" },
          restrictions: { type: "string" },
          mealsPerDay: { type: "number" },
          plan: {
            type: "object",
            description: "days[] with meals and items including calories and macros",
          },
        },
        required: ["title", "plan"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fillField",
      description: "Suggest a value for a single form field. Does not write to the database.",
      parameters: {
        type: "object",
        properties: {
          value: { type: "string" },
          reason: { type: "string" },
        },
        required: ["value"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "playWorkoutMusic",
      description: "Suggest a workout music search query and mood.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          mood: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "summarizeDay",
      description: "Write a short recap of the user's day from provided stats. Return the recap in the summary field.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
        },
        required: ["summary"],
      },
    },
  },
];

import type { JsonValue } from "@/lib/types";

export function summarizeAction(name: string, args: { [key: string]: JsonValue }): string {
  switch (name) {
    case "addMeal":
      return `Log ${args.foodName} (${args.calories} kcal) as ${args.mealType}`;
    case "addWorkout":
      return `Start workout: ${args.title}`;
    case "logSet":
      return `Log set: ${args.exerciseName} ${args.weightKg ?? ""}kg × ${args.reps}`;
    case "logWeight":
      return `Log weight ${args.valueKg} kg`;
    case "createChallenge":
      return `Start challenge: ${args.title}`;
    case "addTodo":
      return `Add to-do: ${args.title}`;
    case "scheduleTimetableBlock":
      return `Schedule ${args.title} (${args.startTime}–${args.endTime})`;
    case "generateDietPlan":
      return `Save diet plan: ${args.title}`;
    case "fillField":
      return `Fill with: ${args.value}`;
    case "playWorkoutMusic":
      return `Play music: ${args.query}`;
    case "summarizeDay":
      return "Save daily recap";
    default:
      return name;
  }
}
