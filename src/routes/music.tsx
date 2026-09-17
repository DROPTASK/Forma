import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { latestTracks, searchTracks, trendingTracks } from "@/lib/server/music";
import { usePlayer } from "@/lib/player";
import type { Track } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/music")({ component: Music });

const shelves = ["Latest", "Workout", "Pop", "Hip-Hop", "Electronic", "Rock", "R&B", "Latin"] as const;

function Music() {
  const [q, setQ] = useState("");
  const [shelf, setShelf] = useState<(typeof shelves)[number]>("Latest");
  const { data: latest } = useQuery({
    queryKey: ["latest-tracks"],
    queryFn: () => latestTracks(),
  });
  const { data: trending } = useQuery({
    queryKey: ["trending", shelf],
    queryFn: () => trendingTracks({ data: { mood: shelf } }),
  });
  const { data: results, isFetching } = useQuery({
    queryKey: ["search-tracks", q],
    queryFn: () => searchTracks({ data: { query: q } }),
    enabled: q.trim().length > 1,
  });
  const play = usePlayer((s) => s.play);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const seek = usePlayer((s) => s.seek);
  const shuffle = usePlayer((s) => s.shuffle);
  const setShuffle = usePlayer((s) => s.setShuffle);
  const repeat = usePlayer((s) => s.repeat);
  const setRepeat = usePlayer((s) => s.setRepeat);
  const outputName = usePlayer((s) => s.outputName);
  const current = queue[index];

  const searching = q.trim().length > 1;
  const list = searching ? (results ?? []) : shelf === "Latest" ? (latest ?? trending ?? []) : (trending ?? []);

  return (
    <Screen title="Music">
      {current ? (
        <Card className="mb-4">
          {current.artworkUrl ? (
            <img src={current.artworkUrl} alt="" className="mb-3 aspect-square w-full rounded-[16px] object-cover" />
          ) : (
            <div className="mb-3 aspect-square w-full rounded-[16px] bg-separator" />
          )}
          <p className="font-display text-[22px] font-semibold">{current.title}</p>
          <p className="text-[15px] text-muted">{current.artistName}</p>
          <input
            type="range"
            min={0}
            max={duration || 1}
            value={position}
            onChange={(e) => seek(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--app-accent)]"
          />
          <div className="flex justify-between text-[12px] tabular text-muted">
            <span>{fmt(position)}</span>
            <span>{fmt(duration)}</span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-5">
            <button type="button" onClick={() => setShuffle(!shuffle)} className={shuffle ? "text-accent" : "text-muted"}>
              <Shuffle className="size-5" />
            </button>
            <button type="button" onClick={prev} aria-label="Previous">
              <SkipBack className="size-7 fill-current" />
            </button>
            <button
              type="button"
              onClick={toggle}
              className="grid size-14 place-items-center rounded-full bg-fg text-bg"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
            </button>
            <button type="button" onClick={next} aria-label="Next">
              <SkipForward className="size-7 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off")}
              className={repeat !== "off" ? "text-accent" : "text-muted"}
            >
              <Repeat className="size-5" />
            </button>
          </div>
          <p className="mt-3 text-center text-[13px] text-muted">Playing on {outputName}</p>
        </Card>
      ) : null}

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search latest tracks, artists, workouts"
        className="mb-3"
      />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {shelves.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setQ("");
              setShelf(m);
            }}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold",
              !searching && shelf === m ? "bg-fg text-bg" : "bg-card text-fg",
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <p className="mb-3 text-[13px] text-muted">
        {searching
          ? isFetching
            ? "Searching Deezer, iTunes, and Audius…"
            : `${list.length} tracks`
          : "Latest chart hits plus full-length independent tracks."}
      </p>
      <div className="space-y-2">
        {list.map((t, i) => (
          <TrackRow key={t.id} track={t} onPlay={() => void play(list, i)} active={current?.id === t.id} />
        ))}
        {list.length === 0 && !isFetching ? (
          <p className="py-8 text-center text-[15px] text-muted">No tracks yet — try another search.</p>
        ) : null}
      </div>
    </Screen>
  );
}

function sourceLabel(source?: Track["source"]) {
  if (source === "deezer") return "Chart";
  if (source === "itunes") return "Latest";
  if (source === "audius") return "Full";
  return null;
}

function TrackRow({ track, onPlay, active }: { track: Track; onPlay: () => void; active: boolean }) {
  const tag = sourceLabel(track.source);
  return (
    <button type="button" onClick={onPlay} className="pressable flex w-full items-center gap-3 text-left">
      {track.artworkUrl ? (
        <img src={track.artworkUrl} alt="" className="size-12 rounded-[10px] object-cover" />
      ) : (
        <div className="size-12 rounded-[10px] bg-separator" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${active ? "text-accent" : ""}`}>{track.title}</p>
        <p className="truncate text-[13px] text-muted">{track.artistName}</p>
      </div>
      {tag ? (
        <span className="shrink-0 rounded-full bg-separator px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          {tag}
        </span>
      ) : null}
    </button>
  );
}

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
