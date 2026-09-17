import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Screen } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAi, executeAiActions } from "@/lib/server/ai";
import { clearAiHistory, listAiHistory } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { searchTracks } from "@/lib/server/music";
import { usePlayer } from "@/lib/player";
import { toast } from "sonner";
import type { ProposedAction } from "@/lib/types";

export const Route = createFileRoute("/ai")({ component: AiChat });

function AiChat() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: keys.ai, queryFn: () => listAiHistory() });
  const [text, setText] = useState("");
  const [pending, setPending] = useState<ProposedAction[] | null>(null);
  const play = usePlayer((s) => s.play);

  const send = useMutation({
    mutationFn: () =>
      askAi({
        data: {
          message: text,
          history: (data ?? []).slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      }),
    onSuccess: (res) => {
      setText("");
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPending(res.actions.length ? res.actions : null);
      void qc.invalidateQueries({ queryKey: keys.ai });
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      const actions = pending ?? [];
      const music = actions.find((a) => a.name === "playWorkoutMusic");
      const rest = actions.filter((a) => a.name !== "playWorkoutMusic");
      if (rest.length) {
        const r = await executeAiActions({ data: { actions: rest } });
        const failed = r.results.find((x) => !x.ok);
        if (failed) throw new Error(failed.detail);
      }
      if (music) {
        const tracks = await searchTracks({ data: { query: String(music.args.query) } });
        if (tracks[0]) await play(tracks, 0);
      }
    },
    onSuccess: () => {
      toast.success("Applied");
      setPending(null);
      void qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const clear = useMutation({
    mutationFn: () => clearAiHistory(),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ai }),
  });

  return (
    <Screen
      title="Ask AI"
      trailing={
        <button type="button" className="text-[13px] text-muted" onClick={() => clear.mutate()}>
          Clear
        </button>
      }
    >
      <div className="mb-24 space-y-3">
        {(data ?? []).map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-[18px] px-4 py-3 text-[15px] leading-relaxed ${
              m.role === "user" ? "ml-auto bg-accent text-accent-fg" : "bg-card"
            }`}
          >
            {m.content}
          </div>
        ))}
        {pending && pending.length > 0 ? (
          <div className="rounded-xl bg-card p-4">
            <p className="mb-2 text-[13px] font-semibold">Confirm</p>
            {pending.map((a) => (
              <p key={a.id} className="text-[15px]">
                {a.summary}
              </p>
            ))}
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => apply.mutate()} disabled={apply.isPending}>
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="fixed bottom-[5.5rem] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-5">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Log 2 eggs, start a streak…"
            onKeyDown={(e) => {
              if (e.key === "Enter") send.mutate();
            }}
          />
          <Button disabled={!text.trim() || send.isPending} onClick={() => send.mutate()}>
            Send
          </Button>
        </div>
      </div>
    </Screen>
  );
}
