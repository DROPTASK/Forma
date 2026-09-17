import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { addSet, finishSession, getSessionDetail, listExercises } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { toast } from "sonner";
import type { Exercise } from "@/lib/types";
import { trendingTracks } from "@/lib/server/music";
import { usePlayer } from "@/lib/player";
import { Music2 } from "lucide-react";

export const Route = createFileRoute("/session/$id")({ component: SessionPage });

function SessionPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: keys.session(id),
    queryFn: () => getSessionDetail({ data: { id } }),
  });
  const { data: exercises } = useQuery({ queryKey: keys.exercises, queryFn: () => listExercises() });
  const [picker, setPicker] = useState(false);
  const [current, setCurrent] = useState<Exercise | null>(null);
  const [reps, setReps] = useState("8");
  const [weight, setWeight] = useState("40");
  const [rest, setRest] = useState(0);

  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [rest]);

  const setsForCurrent = useMemo(
    () => (data?.sets ?? []).filter((s) => (current ? s.exerciseId === current.id : true)),
    [data, current],
  );

  const log = useMutation({
    mutationFn: () => {
      if (!current) throw new Error("Pick an exercise");
      const n = setsForCurrent.filter((s) => s.exerciseId === current.id).length + 1;
      return addSet({
        data: {
          sessionId: id,
          exerciseId: current.id,
          exerciseName: current.name,
          muscleGroups: current.muscleGroups,
          setNumber: n,
          reps: Number(reps) || null,
          weightKg: Number(weight) || null,
          restSeconds: 90,
        },
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.session(id) });
      setRest(90);
      try {
        navigator.vibrate?.(30);
      } catch {
        /* ignore */
      }
    },
  });

  const finish = useMutation({
    mutationFn: () => finishSession({ data: { id } }),
    onSuccess: () => {
      toast.success("Workout saved");
      void qc.invalidateQueries();
      void nav({ to: "/train" });
    },
  });

  const playMusic = usePlayer((s) => s.play);
  const playing = usePlayer((s) => s.isPlaying);

  if (!data) {
    return (
      <Screen title="Session">
        <div className="h-40 animate-pulse rounded-xl bg-card" />
      </Screen>
    );
  }

  return (
    <Screen title={data.session.title ?? "Session"}>
      <button
        type="button"
        className="mb-3 flex h-10 items-center gap-2 rounded-full bg-card px-3 text-[13px] font-semibold shadow-[var(--app-shadow)]"
        onClick={() => {
          void trendingTracks({ data: { mood: "Workout" } }).then((tracks) => {
            if (tracks[0]) void playMusic(tracks, 0);
          });
        }}
      >
        <Music2 className="size-4 text-accent" />
        {playing ? "Playing workout mix" : "Play workout mix"}
      </button>
      {rest > 0 ? (
        <Card className="mb-3 text-center">
          <p className="text-[13px] text-muted">Rest</p>
          <p className="font-display text-[40px] font-semibold tabular">{rest}s</p>
        </Card>
      ) : null}

      <button type="button" onClick={() => setPicker(true)} className="mb-3 w-full text-left">
        <Card className="pressable">
          <p className="text-[13px] text-muted">Exercise</p>
          <p className="font-display text-[22px] font-semibold">{current?.name ?? "Choose exercise"}</p>
        </Card>
      </button>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[13px] text-muted">Weight (kg)</p>
          <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-[13px] text-muted">Reps</p>
          <Input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
        </div>
      </div>
      <Button className="mb-4 w-full" disabled={!current || log.isPending} onClick={() => log.mutate()}>
        Log set
      </Button>

      <div className="space-y-2">
        {data.sets.map((s) => (
          <Card key={s.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{s.exerciseName}</p>
              <p className="text-[13px] text-muted">Set {s.setNumber}</p>
            </div>
            <p className="tabular font-semibold">
              {s.weightKg ?? "—"} kg × {s.reps ?? "—"}
            </p>
          </Card>
        ))}
      </div>

      <Button className="mt-6 w-full" variant="secondary" onClick={() => finish.mutate()} disabled={finish.isPending}>
        Finish workout
      </Button>

      <Sheet open={picker} onOpenChange={setPicker}>
        <SheetContent title="Exercises">
          <div className="space-y-2">
            {(exercises ?? []).map((e) => (
              <button
                key={e.id}
                type="button"
                className="pressable w-full rounded-[14px] bg-bg px-3 py-3 text-left"
                onClick={() => {
                  setCurrent(e);
                  setPicker(false);
                }}
              >
                <p className="font-semibold">{e.name}</p>
                <p className="text-[13px] capitalize text-muted">{e.muscleGroups.join(" · ")}</p>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
