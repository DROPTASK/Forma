import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { getDaily, getDashboard, saveDaily } from "@/lib/server/fitness";
import { askAi, executeAiActions } from "@/lib/server/ai";
import { keys } from "@/lib/query";
import { todayISO } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/journal")({ component: Journal });

function Journal() {
  const date = todayISO();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: keys.journal(date), queryFn: () => getDaily({ data: { date } }) });
  const { data: dash } = useQuery({ queryKey: keys.dashboard, queryFn: () => getDashboard() });
  const [notes, setNotes] = useState<string | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const noteVal = notes ?? data?.notes ?? "";
  const moodVal = mood ?? data?.mood ?? 0;

  const save = useMutation({
    mutationFn: () => saveDaily({ data: { date, notes: noteVal, mood: moodVal || null } }),
    onSuccess: () => {
      toast.success("Saved");
      void qc.invalidateQueries({ queryKey: keys.journal(date) });
    },
  });

  const [busy, setBusy] = useState(false);
  async function recap() {
    setBusy(true);
    try {
      const ctx = `Calories ${Math.round(dash?.calories ?? 0)}, workouts ${dash?.sessions.length ?? 0}, weight ${dash?.latestWeight?.valueKg ?? "n/a"}.`;
      const res = await askAi({
        data: {
          message: "Write a 3-sentence recap of my day and save it with summarizeDay.",
          context: ctx,
          toolNames: ["summarizeDay"],
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.actions.length) await executeAiActions({ data: { actions: res.actions } });
      void qc.invalidateQueries({ queryKey: keys.journal(date) });
      toast.success("Recap saved");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Journal">
      <Card className="mb-4">
        <p className="mb-2 text-[13px] text-muted">Mood</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMood(n)}
              className={`size-11 rounded-full text-[15px] font-semibold ${
                moodVal === n ? "bg-accent text-accent-fg" : "bg-bg text-muted"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Card>
      <Card className="mb-4 space-y-2 text-[15px] text-muted">
        <p>Workouts: {dash?.sessions.length ?? 0}</p>
        <p>Calories: {Math.round(dash?.calories ?? 0)}</p>
        <p>Weight: {dash?.latestWeight?.valueKg ?? "—"} kg</p>
      </Card>
      <Textarea
        className="mb-3"
        value={noteVal}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="How did today go?"
      />
      <Button className="mb-2 w-full" onClick={() => save.mutate()} disabled={save.isPending}>
        Save notes
      </Button>
      <Button className="mb-4 w-full" variant="secondary" disabled={busy} onClick={() => void recap()}>
        {busy ? "Writing…" : "Ask AI to summarize"}
      </Button>
      {data?.aiSummary ? (
        <Card>
          <p className="text-[13px] font-semibold text-muted">AI recap</p>
          <p className="mt-2 text-[15px] leading-relaxed">{data.aiSummary}</p>
        </Card>
      ) : null}
    </Screen>
  );
}
