import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/input";
import { askAi, executeAiActions } from "@/lib/server/ai";
import { keys } from "@/lib/query";
import { usePlayer } from "@/lib/player";
import { searchTracks } from "@/lib/server/music";
import type { ProposedAction } from "@/lib/types";

export function AskAiButton({
  label = "Ask AI",
  context,
  toolNames,
  onFill,
}: {
  label?: string;
  context?: string;
  toolNames?: string[];
  onFill?: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable inline-flex h-8 items-center gap-1.5 rounded-full bg-info/12 px-3 text-[13px] font-semibold text-info"
      >
        <Sparkles className="size-3.5" />
        {label}
      </button>
      <AskAiSheet
        open={open}
        onOpenChange={setOpen}
        context={context}
        toolNames={toolNames}
        onFill={onFill}
      />
    </>
  );
}

export function AskAiSheet({
  open,
  onOpenChange,
  context,
  toolNames,
  onFill,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context?: string;
  toolNames?: string[];
  onFill?: (value: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [actions, setActions] = useState<ProposedAction[]>([]);
  const qc = useQueryClient();
  const play = usePlayer((s) => s.play);

  async function send() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const res = await askAi({
        data: { message: prompt.trim(), context, toolNames },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setReply(res.text);
      setActions(res.actions);
      const fill = res.actions.find((a) => a.name === "fillField");
      if (fill && onFill) onFill(String(fill.args.value ?? ""));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!actions.length) return;
    setBusy(true);
    try {
      const music = actions.find((a) => a.name === "playWorkoutMusic");
      const rest = actions.filter((a) => a.name !== "playWorkoutMusic" && a.name !== "fillField");
      if (rest.length) {
        const r = await executeAiActions({ data: { actions: rest } });
        const failed = r.results.find((x) => !x.ok);
        if (failed) toast.error(failed.detail);
        else toast.success("Applied");
        void qc.invalidateQueries();
      }
      if (music) {
        const tracks = await searchTracks({ data: { query: String(music.args.query) } });
        if (tracks[0]) {
          await play(tracks, 0);
          toast.success(`Playing ${tracks[0].title}`);
        }
      }
      onOpenChange(false);
      setPrompt("");
      setReply("");
      setActions([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Ask Forma">
        <p className="mb-3 text-[15px] text-muted">
          Describe what you want logged, planned, or filled in.
        </p>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="2 eggs and toast for breakfast…"
        />
        <Button className="mt-3 w-full" disabled={busy || !prompt.trim()} onClick={() => void send()}>
          {busy ? "Thinking…" : "Send"}
        </Button>
        {reply ? <p className="mt-4 text-[15px] leading-relaxed">{reply}</p> : null}
        {actions.length > 0 ? (
          <div className="mt-3 space-y-2">
            {actions.map((a) => (
              <div key={a.id} className="rounded-[14px] bg-bg px-3 py-2 text-[15px]">
                {a.summary}
              </div>
            ))}
            <Button className="w-full" variant="secondary" disabled={busy} onClick={() => void confirm()}>
              Confirm
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
