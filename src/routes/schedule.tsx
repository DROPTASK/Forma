import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AskAiButton } from "@/components/ask-ai";
import { deleteBlock, listBlocks, saveBlock } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { weekdayShort } from "@/lib/format";
import type { BlockCategory } from "@/lib/types";

export const Route = createFileRoute("/schedule")({ component: Schedule });

const cats: BlockCategory[] = ["workout", "meal", "sleep", "other"];

function Schedule() {
  const qc = useQueryClient();
  const { data: blocks } = useQuery({ queryKey: keys.timetable, queryFn: () => listBlocks() });
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(1);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("08:00");
  const [cat, setCat] = useState<BlockCategory>("workout");

  const save = useMutation({
    mutationFn: () =>
      saveBlock({ data: { dayOfWeek: day, startTime: start, endTime: end, title, category: cat } }),
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      void qc.invalidateQueries({ queryKey: keys.timetable });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteBlock({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.timetable }),
  });

  return (
    <Screen title="Schedule" trailing={<AskAiButton toolNames={["scheduleTimetableBlock"]} />}>
      <Button className="mb-4 w-full" onClick={() => setOpen(true)}>
        Add block
      </Button>
      {[0, 1, 2, 3, 4, 5, 6].map((d) => {
        const items = (blocks ?? []).filter((b) => b.dayOfWeek === d);
        return (
          <div key={d} className="mb-4">
            <h2 className="mb-2 text-[13px] font-semibold text-muted">{weekdayShort(d)}</h2>
            {items.length === 0 ? (
              <p className="text-[13px] text-muted">Free</p>
            ) : (
              <div className="space-y-2">
                {items.map((b) => (
                  <Card key={b.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold">{b.title}</p>
                      <p className="text-[13px] capitalize text-muted">
                        {b.startTime}–{b.endTime} · {b.category}
                      </p>
                    </div>
                    <button type="button" className="text-[13px] text-danger" onClick={() => remove.mutate(b.id)}>
                      Remove
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title="New block">
          <div className="mb-3 flex gap-1 overflow-x-auto">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={`h-9 rounded-full px-3 text-[13px] font-semibold ${
                  day === d ? "bg-accent text-accent-fg" : "bg-bg text-muted"
                }`}
              >
                {weekdayShort(d)}
              </button>
            ))}
          </div>
          <Input className="mb-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Input value={start} onChange={(e) => setStart(e.target.value)} />
            <Input value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="mb-4 flex gap-1">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`h-8 rounded-full px-3 text-[13px] capitalize ${
                  cat === c ? "bg-accent text-accent-fg" : "bg-bg text-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <Button className="w-full" disabled={!title || save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
