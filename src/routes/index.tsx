import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";
import { ActivityRings } from "@/components/rings";
import { AskAiButton } from "@/components/ask-ai";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboard, seedSampleWeek, saveProfile } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { formatKg, formatKcal } from "@/lib/format";
import { Line, LineChart, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: keys.dashboard, queryFn: () => getDashboard() });
  const seed = useMutation({
    mutationFn: () => seedSampleWeek(),
    onSuccess: () => qc.invalidateQueries(),
  });
  const skipOnboard = useMutation({
    mutationFn: () => saveProfile({ data: { onboardingComplete: true } }),
    onSuccess: () => qc.invalidateQueries(),
  });

  if (isLoading || !data) {
    return (
      <Screen title="Today">
        <div className="h-48 animate-pulse rounded-xl bg-card" />
      </Screen>
    );
  }

  const p = data.profile;
  const exerciseMin = data.sessions.length ? Math.max(20, Math.round(data.weeklyVolume / 800)) : 0;
  const streak = data.challenges[0]?.streak ?? 0;

  return (
    <Screen
      title="Today"
      trailing={<AskAiButton context={`Calories ${Math.round(data.calories)}/${p.calorieGoal}. Weight ${data.latestWeight?.valueKg ?? "n/a"} kg.`} />}
    >
      {!p.onboardingComplete ? (
        <Card className="mb-4">
          <h2 className="font-display text-[22px] font-semibold">Welcome to Forma</h2>
          <p className="mt-1 text-[15px] text-muted">
            Set your height and goals, or load a sample week to explore every screen.
          </p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => seed.mutate()} disabled={seed.isPending}>
              Load sample week
            </Button>
            <Button size="sm" variant="secondary" onClick={() => skipOnboard.mutate()}>
              Skip
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="mb-3">
        <ActivityRings
          calories={data.calories}
          calorieGoal={p.calorieGoal}
          exerciseMin={exerciseMin}
          exerciseGoal={30}
          streak={streak}
          streakGoal={7}
        />
      </Card>

      <Link to="/weight" className="mb-3 block">
        <Card className="pressable">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-muted">Weight</p>
              <p className="font-display text-[28px] font-semibold tabular">
                {data.latestWeight ? formatKg(data.latestWeight.valueKg, p.unitPref) : "—"}
              </p>
              {data.weightTrend.length >= 2 ? (
                <p className="text-[13px] text-muted">
                  {weekDelta(data.weightTrend, p.unitPref)}
                </p>
              ) : (
                <p className="text-[13px] text-muted">Log your first weigh-in</p>
              )}
            </div>
            <div className="h-14 w-28">
              {data.weightTrend.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.weightTrend}>
                    <Line type="monotone" dataKey="kg" stroke="var(--app-accent)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>
        </Card>
      </Link>

      <Link to="/eat" className="mb-3 block">
        <Card className="pressable">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-muted">Meals</p>
              <p className="font-display text-[22px] font-semibold tabular">{formatKcal(data.calories)}</p>
              <p className="text-[13px] text-muted">
                P {Math.round(data.protein)} · C {Math.round(data.carbs)} · F {Math.round(data.fat)}
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-tint-eat/15 text-tint-eat">
              <Plus className="size-5" />
            </span>
          </div>
        </Card>
      </Link>

      <Link to="/train" className="mb-3 block">
        <Card className="pressable">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-muted">Workout</p>
              <p className="font-display text-[22px] font-semibold">
                {data.sessions[0]?.title ?? (data.blocks.find((b) => b.category === "workout")?.title ?? "Rest day")}
              </p>
              <p className="text-[13px] text-muted">
                {data.sessions[0]
                  ? `${data.sessions[0].setCount} sets · ${Math.round(data.sessions[0].volume)} kg volume`
                  : data.blocks.find((b) => b.category === "workout")
                    ? `Scheduled ${data.blocks.find((b) => b.category === "workout")?.startTime}`
                    : "Start a session"}
              </p>
            </div>
            <ChevronRight className="size-5 text-muted" />
          </div>
        </Card>
      </Link>

      {data.challenges.length > 0 ? (
        <div className="mb-3 overflow-x-auto">
          <div className="flex gap-2">
            {data.challenges.map((c) => (
              <Link key={c.id} to="/challenges" className="min-w-[140px]">
                <Card className="pressable">
                  <p className="text-[13px] text-muted">{c.title}</p>
                  <p className="font-display text-[28px] font-semibold tabular text-success">{c.streak}</p>
                  <p className="text-[12px] text-muted">{c.checkedInToday ? "Checked in" : "Due today"}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {data.blocks.length > 0 ? (
        <Card className="mb-3">
          <p className="mb-2 text-[13px] font-medium text-muted">Schedule</p>
          <ul className="space-y-2">
            {data.blocks.slice(0, 4).map((b) => (
              <li key={b.id} className="flex items-center justify-between text-[15px]">
                <span>{b.title}</span>
                <span className="tabular text-muted">
                  {b.startTime}–{b.endTime}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </Screen>
  );
}

function weekDelta(trend: { date: string; kg: number }[], unit: "kg" | "lb") {
  const last = trend[trend.length - 1]?.kg;
  const prev = trend[Math.max(0, trend.length - 8)]?.kg;
  if (last == null || prev == null) return "";
  const d = last - prev;
  const sign = d > 0 ? "+" : "";
  return `${sign}${formatKg(d, unit)} this week`;
}
