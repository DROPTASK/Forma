import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty";
import { AskAiButton } from "@/components/ask-ai";
import { createSession, listExercises, listSessions } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { formatDateLabel } from "@/lib/format";
import { Dumbbell } from "lucide-react";

export const Route = createFileRoute("/train")({ component: Train });

function Train() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: sessions } = useQuery({ queryKey: keys.sessions, queryFn: () => listSessions() });
  const { data: exercises } = useQuery({ queryKey: keys.exercises, queryFn: () => listExercises() });
  const start = useMutation({
    mutationFn: (title: string) => createSession({ data: { title } }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: keys.sessions });
      void nav({ to: "/session/$id", params: { id: r.id } });
    },
  });

  const filtered = useMemo(() => {
    const list = exercises ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((e) => e.name.toLowerCase().includes(s) || e.muscleGroups.some((m) => m.includes(s)));
  }, [exercises, q]);

  return (
    <Screen title="Train" trailing={<AskAiButton toolNames={["addWorkout", "logSet", "playWorkoutMusic"]} />}>
      <Button className="mb-4 w-full" onClick={() => start.mutate("Workout")} disabled={start.isPending}>
        Start session
      </Button>

      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Recent</h2>
      {!sessions?.length ? (
        <EmptyState icon={Dumbbell} title="No workouts yet" caption="Start a session and log sets as you train." />
      ) : (
        <div className="mb-6 space-y-2">
          {sessions.slice(0, 6).map((s) => (
            <Link key={s.id} to="/session/$id" params={{ id: s.id }} className="block">
              <Card className="pressable flex items-center justify-between">
                <div>
                  <p className="font-semibold">{s.title ?? "Workout"}</p>
                  <p className="text-[13px] text-muted">
                    {formatDateLabel(s.date)} · {s.setCount} sets
                  </p>
                </div>
                <p className="tabular text-[13px] text-muted">{Math.round(s.volume)} kg</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Library</h2>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" className="mb-3" />
      <div className="space-y-2">
        {filtered.slice(0, 40).map((e) => (
          <Link key={e.id} to="/exercise/$id" params={{ id: e.id }} className="block">
            <Card className="pressable">
              <p className="font-semibold">{e.name}</p>
              <p className="text-[13px] capitalize text-muted">
                {e.muscleGroups.join(" · ")} · {e.equipment}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </Screen>
  );
}
