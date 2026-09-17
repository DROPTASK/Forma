import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

export const keys = {
  profile: ["profile"] as const,
  dashboard: ["dashboard"] as const,
  exercises: ["exercises"] as const,
  sessions: ["sessions"] as const,
  session: (id: string) => ["session", id] as const,
  exerciseHistory: (id: string) => ["exercise-history", id] as const,
  meals: (date: string) => ["meals", date] as const,
  weight: ["weight"] as const,
  challenges: ["challenges"] as const,
  todos: ["todos"] as const,
  timetable: ["timetable"] as const,
  journal: (date: string) => ["journal", date] as const,
  diet: ["diet"] as const,
  body: ["body"] as const,
  muscle: ["muscle"] as const,
  ai: ["ai"] as const,
  playlists: ["playlists"] as const,
  foods: (q: string) => ["foods", q] as const,
};
