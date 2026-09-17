import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AskAiButton } from "@/components/ask-ai";
import { checkInChallenge, createChallenge, deleteChallenge, listChallenges } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { addDaysISO, todayISO } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/challenges")({ component: Challenges });

function Challenges() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: keys.challenges, queryFn: () => listChallenges() });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [days, setDays] = useState("30");
  const [task, setTask] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createChallenge({ data: { title, targetDays: Number(days) || 30, dailyTask: task } }),
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      void qc.invalidateQueries({ queryKey: keys.challenges });
    },
  });
  const check = useMutation({
    mutationFn: (id: string) => checkInChallenge({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.challenges }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteChallenge({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.challenges }),
  });

  return (
    <Screen title="Challenges" trailing={<AskAiButton toolNames={["createChallenge"]} />}>
      <Button className="mb-4 w-full" onClick={() => setOpen(true)}>
        New challenge
      </Button>
      <div className="space-y-3">
        {(data ?? []).map((c) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-[22px] font-semibold">{c.title}</p>
                <p className="text-[13px] text-muted">{c.dailyTask}</p>
              </div>
              <p className="font-display text-[28px] font-bold tabular text-success">{c.currentStreak}</p>
            </div>
            <Heatmap dates={c.checkIns} />
            <p className="mt-2 text-[12px] text-muted">
              Longest {c.longestStreak} · {c.completionPct}% of {c.targetDays} days
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" disabled={c.checkedInToday || check.isPending} onClick={() => check.mutate(c.id)}>
                {c.checkedInToday ? "Done today" : "Check in"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(c.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title="New challenge">
          <Input className="mb-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <Input className="mb-2" value={days} onChange={(e) => setDays(e.target.value)} placeholder="Days" />
          <Input className="mb-4" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Daily task" />
          <Button className="w-full" disabled={!title} onClick={() => create.mutate()}>
            Start
          </Button>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}

function Heatmap({ dates }: { dates: string[] }) {
  const set = new Set(dates);
  const today = todayISO();
  const cells = Array.from({ length: 28 }, (_, i) => addDaysISO(today, i - 27));
  return (
    <div className="mt-3 grid grid-cols-7 gap-1.5">
      {cells.map((d) => (
        <div
          key={d}
          className={cn("aspect-square rounded-[6px]", set.has(d) ? "bg-success" : "bg-separator")}
          title={d}
        />
      ))}
    </div>
  );
}
