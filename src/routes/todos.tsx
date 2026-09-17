import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AskAiButton } from "@/components/ask-ai";
import { addTodo, deleteTodo, listTodos, toggleTodo } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { EmptyState } from "@/components/empty";
import { ListTodo } from "lucide-react";

export const Route = createFileRoute("/todos")({ component: Todos });

function Todos() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: keys.todos, queryFn: () => listTodos() });
  const [title, setTitle] = useState("");

  const add = useMutation({
    mutationFn: () => addTodo({ data: { title } }),
    onSuccess: () => {
      setTitle("");
      void qc.invalidateQueries({ queryKey: keys.todos });
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("Forma reminder saved", { body: title });
        } catch {
          /* ignore */
        }
      }
    },
  });
  const tog = useMutation({
    mutationFn: (d: { id: string; done: boolean }) => toggleTodo({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.todos }),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteTodo({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.todos }),
  });

  return (
    <Screen title="To-dos" trailing={<AskAiButton toolNames={["addTodo"]} />}>
      <div className="mb-4 flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Buy protein powder…" />
        <Button disabled={!title || add.isPending} onClick={() => add.mutate()}>
          Add
        </Button>
      </div>
      {!data?.length ? (
        <EmptyState icon={ListTodo} title="Nothing queued" caption="Gym restocks, errands, anything you should not forget." />
      ) : (
        <div className="space-y-2">
          {data.map((t) => (
            <Card key={t.id} className="flex items-center gap-3 py-3">
              <button
                type="button"
                onClick={() => tog.mutate({ id: t.id, done: !t.done })}
                className={`size-6 rounded-full border ${t.done ? "border-success bg-success" : "border-separator"}`}
                aria-label="Toggle"
              />
              <p className={`flex-1 ${t.done ? "text-muted line-through" : ""}`}>{t.title}</p>
              <button type="button" className="text-[13px] text-danger" onClick={() => del.mutate(t.id)}>
                Delete
              </button>
            </Card>
          ))}
        </div>
      )}
    </Screen>
  );
}
