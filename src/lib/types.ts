export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type UnitPref = "kg" | "lb";
export type ThemePref = "system" | "light" | "dark";
export type GoalType = "cut" | "bulk" | "maintain";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type BlockCategory = "workout" | "meal" | "sleep" | "other";

export type Profile = {
  userId: string;
  displayName: string | null;
  heightCm: number | null;
  sex: string | null;
  birthYear: number | null;
  activityLevel: string;
  goalType: GoalType;
  goalWeightKg: number | null;
  goalWeightHighKg: number | null;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  unitPref: UnitPref;
  themePref: ThemePref;
  onboardingComplete: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  notificationsEnabled: boolean;
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string;
  isCustom: boolean;
  instructions: string | null;
};

export type WorkoutSession = {
  id: string;
  date: string;
  title: string | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  setCount: number;
  volume: number;
};

export type SetLog = {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroups: string[];
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  restSeconds: number | null;
};

export type Food = {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: string;
};

export type MealEntry = {
  id: string;
  date: string;
  mealType: MealType;
  foodId: string | null;
  foodName: string;
  quantityG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  aiParsed: boolean;
};

export type WeightEntry = {
  id: string;
  date: string;
  valueKg: number;
  source: "manual" | "ble";
  bodyFatPct: number | null;
  deviceName: string | null;
  loggedAt: string;
};

export type Challenge = {
  id: string;
  title: string;
  type: "streak" | "duration";
  targetDays: number;
  startDate: string;
  endDate: string | null;
  dailyTask: string | null;
  graceEnabled: boolean;
  currentStreak: number;
  longestStreak: number;
  checkedInToday: boolean;
  completionPct: number;
  checkIns: string[];
};

export type TodoItem = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  remindAt: string | null;
  done: boolean;
};

export type TimetableBlock = {
  id: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string;
  endTime: string;
  title: string;
  category: BlockCategory;
  reminderMinutes: number | null;
};

export type BodySnapshot = {
  id: string;
  date: string;
  heightUsedCm: number;
  shoulderWidthCm: number | null;
  armLengthLCm: number | null;
  armLengthRCm: number | null;
  torsoLengthCm: number | null;
  legLengthLCm: number | null;
  legLengthRCm: number | null;
  hipWidthCm: number | null;
  estimatedWaistWidthCm: number | null;
  estimatedChestWidthCm: number | null;
  notes: string | null;
};

export type DailyRecord = {
  date: string;
  mood: number | null;
  notes: string | null;
  aiSummary: string | null;
};

export type DietPlan = {
  id: string;
  title: string;
  goalType: string | null;
  calorieTarget: number | null;
  dietType: string | null;
  restrictions: string | null;
  mealsPerDay: number | null;
  plan: DietPlanJson;
  createdAt: string;
};

export type DietPlanJson = {
  days: {
    day: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    meals: {
      mealType: MealType;
      items: {
        name: string;
        qty: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }[];
    }[];
  }[];
};

export type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions: ProposedAction[];
  createdAt: string;
};

export type ProposedAction = {
  id: string;
  name: string;
  args: { [key: string]: JsonValue };
  summary: string;
};

export type Track = {
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  durationSec: number;
  streamUrl?: string;
  source?: "audius" | "deezer" | "itunes" | "jamendo";
};

export type MuscleVolume = Record<string, number>;
