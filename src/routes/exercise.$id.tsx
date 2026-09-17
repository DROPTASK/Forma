import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSession, getExerciseHistory, listExercises } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { epley1rm } from "@/lib/format";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/exercise/$id")({ component: ExerciseDetail });

function ExerciseDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: exercises } = useQuery({ queryKey: keys.exercises, queryFn: () => listExercises() });
  const { data: history } = useQuery({
    queryKey: keys.exerciseHistory(id),
    queryFn: () => getExerciseHistory({ data: { exerciseId: id } }),
  });
  const ex = exercises?.find((e) => e.id === id);
  const start = useMutation({
    mutationFn: () => createSession({ data: { title: ex?.name ?? "Workout" } }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: keys.sessions });
      void nav({ to: "/session/$id", params: { id: r.id } });
    },
  });

  const chart = (history ?? []).map((s) => ({
    date: s.date,
    max: s.weightKg ?? 0,
    e1rm: s.weightKg && s.reps ? Math.round(epley1rm(s.weightKg, s.reps) * 10) / 10 : 0,
  }));

  return (
    <Screen title={ex?.name ?? "Exercise"}>
      <p className="mb-4 text-[15px] capitalize text-muted">
        {ex?.muscleGroups.join(" · ")} · {ex?.equipment}
      </p>
      {ex?.instructions ? <p className="mb-4 text-[15px] leading-relaxed">{ex.instructions}</p> : null}
      <Button className="mb-5 w-full" onClick={() => start.mutate()}>
        Add to session
      </Button>
      <Card className="mb-4 h-48">
        {chart.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="max" stroke="var(--app-accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="e1rm" stroke="var(--color-ring-ex)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="grid h-full place-items-center text-[15px] text-muted">No history yet</p>
        )}
      </Card>
      <div className="space-y-2">
        {(history ?? [])
          .slice()
          .reverse()
          .slice(0, 20)
          .map((s) => (
            <Card key={s.id} className="flex justify-between py-3">
              <span className="text-[13px] text-muted">{s.date}</span>
              <span className="tabular font-semibold">
                {s.weightKg ?? "—"} × {s.reps ?? "—"}
              </span>
            </Card>
          ))}
      </div>
    </Screen>
  );
}
