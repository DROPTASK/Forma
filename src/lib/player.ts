import { create } from "zustand";
import type { Track } from "@/lib/types";
import { resolveStream } from "@/lib/server/music";

type Repeat = "off" | "one" | "all";

type PlayerState = {
  queue: Track[];
  index: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: Repeat;
  outputName: string;
  play: (tracks: Track[], start?: number) => Promise<void>;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  setShuffle: (v: boolean) => void;
  setRepeat: (v: Repeat) => void;
};

let audio: HTMLAudioElement | null = null;
function el() {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
  }
  return audio;
}

function outputLabel(): string {
  return "This device";
}

export const usePlayer = create<PlayerState>()((set, get) => ({
  queue: [],
  index: 0,
  isPlaying: false,
  position: 0,
  duration: 0,
  shuffle: false,
  repeat: "off",
  outputName: "This device",
  play: async (tracks, start = 0) => {
    const a = el();
    if (!a || tracks.length === 0) return;
    set({ queue: tracks, index: start, outputName: outputLabel() });
    const track = tracks[start];
    let url = track.streamUrl ?? "";
    if (!url) {
      const resolved = await resolveStream({ data: { id: track.id, streamUrl: track.streamUrl } });
      url = resolved.url;
    }
    if (!url) return;
    a.src = url;
    a.crossOrigin = "anonymous";
    a.onended = () => get().next();
    a.ontimeupdate = () => set({ position: a.currentTime, duration: a.duration || track.durationSec || 0 });
    try {
      await a.play();
      set({ isPlaying: true });
      if (navigator.mediaSession) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artistName,
          artwork: track.artworkUrl ? [{ src: track.artworkUrl, sizes: "480x480" }] : [],
        });
        navigator.mediaSession.setActionHandler("play", () => get().toggle());
        navigator.mediaSession.setActionHandler("pause", () => get().toggle());
        navigator.mediaSession.setActionHandler("previoustrack", () => get().prev());
        navigator.mediaSession.setActionHandler("nexttrack", () => get().next());
      }
    } catch {
      set({ isPlaying: false });
    }
  },
  toggle: () => {
    const a = el();
    if (!a) return;
    if (a.paused) {
      void a.play();
      set({ isPlaying: true });
    } else {
      a.pause();
      set({ isPlaying: false });
    }
  },
  next: () => {
    const { queue, index, repeat, shuffle } = get();
    if (queue.length === 0) return;
    if (repeat === "one") {
      void get().play(queue, index);
      return;
    }
    let next = index + 1;
    if (shuffle) next = Math.floor(Math.random() * queue.length);
    if (next >= queue.length) {
      if (repeat === "all") next = 0;
      else {
        el()?.pause();
        set({ isPlaying: false });
        return;
      }
    }
    void get().play(queue, next);
  },
  prev: () => {
    const { queue, index, position } = get();
    if (position > 3) {
      const a = el();
      if (a) a.currentTime = 0;
      return;
    }
    const prev = index <= 0 ? queue.length - 1 : index - 1;
    void get().play(queue, prev);
  },
  seek: (sec) => {
    const a = el();
    if (a) a.currentTime = sec;
    set({ position: sec });
  },
  setShuffle: (v) => set({ shuffle: v }),
  setRepeat: (v) => set({ repeat: v }),
}));
