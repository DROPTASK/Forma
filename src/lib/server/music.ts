import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import type { Track } from "@/lib/types";
import { uid } from "@/lib/utils";

let cachedHost: { url: string; at: number } | null = null;

async function audiusHost(): Promise<string> {
  if (cachedHost && Date.now() - cachedHost.at < 10 * 60_000) return cachedHost.url;
  try {
    const res = await fetch("https://api.audius.co", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const body = (await res.json()) as { data?: string[] };
      const host = body.data?.[0];
      if (host) {
        cachedHost = { url: host.replace(/\/$/, ""), at: Date.now() };
        return cachedHost.url;
      }
    }
  } catch {
    /* fall through */
  }
  cachedHost = { url: "https://discoveryprovider.audius.co", at: Date.now() };
  return cachedHost.url;
}

function mapAudius(t: Record<string, unknown>): Track {
  const user = (t.user as Record<string, unknown> | undefined) ?? {};
  const art = (t.artwork as Record<string, string> | undefined) ?? {};
  return {
    id: `audius-${String(t.id ?? "")}`,
    title: String(t.title ?? "Untitled"),
    artistName: String(user.name ?? user.handle ?? "Unknown"),
    artworkUrl: art["480x480"] || art["150x150"] || null,
    durationSec: Number(t.duration ?? 0),
    source: "audius",
  };
}

function mapDeezer(t: Record<string, unknown>): Track | null {
  const preview = String(t.preview ?? "");
  if (!preview) return null;
  const artist = (t.artist as Record<string, unknown> | undefined) ?? {};
  const album = (t.album as Record<string, unknown> | undefined) ?? {};
  return {
    id: `deezer-${String(t.id ?? "")}`,
    title: String(t.title ?? "Untitled"),
    artistName: String(artist.name ?? "Unknown"),
    artworkUrl: String(album.cover_xl || album.cover_medium || album.cover_big || "") || null,
    durationSec: Number(t.duration ?? 30),
    streamUrl: preview,
    source: "deezer",
  };
}

function mapItunes(t: Record<string, unknown>): Track | null {
  const preview = String(t.previewUrl ?? "");
  if (!preview) return null;
  const art = String(t.artworkUrl100 ?? "").replace("100x100bb", "400x400bb");
  return {
    id: `itunes-${String(t.trackId ?? t.collectionId ?? "")}`,
    title: String(t.trackName ?? "Untitled"),
    artistName: String(t.artistName ?? "Unknown"),
    artworkUrl: art || null,
    durationSec: Math.round(Number(t.trackTimeMillis ?? 30_000) / 1000),
    streamUrl: preview,
    source: "itunes",
  };
}

function dedupe(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const t of tracks) {
    const key = `${t.title.toLowerCase()}::${t.artistName.toLowerCase()}`;
    if (seen.has(key) || seen.has(t.id)) continue;
    seen.add(key);
    seen.add(t.id);
    out.push(t);
  }
  return out;
}

async function fetchJson(url: string, ms = 8000): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(ms),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function deezerSearch(query: string): Promise<Track[]> {
  const body = (await fetchJson(
    `https://api.deezer.com/search/track?q=${encodeURIComponent(query)}&limit=25`,
  )) as { data?: Record<string, unknown>[] };
  return (body.data ?? []).map(mapDeezer).filter((t): t is Track => !!t);
}

async function deezerChart(): Promise<Track[]> {
  const body = (await fetchJson("https://api.deezer.com/chart/0/tracks?limit=40")) as {
    data?: Record<string, unknown>[];
  };
  return (body.data ?? []).map(mapDeezer).filter((t): t is Track => !!t);
}

async function itunesSearch(query: string): Promise<Track[]> {
  const body = (await fetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=25`,
  )) as { results?: Record<string, unknown>[] };
  return (body.results ?? []).map(mapItunes).filter((t): t is Track => !!t);
}

async function audiusSearch(query: string): Promise<Track[]> {
  const host = await audiusHost();
  const body = (await fetchJson(
    `${host}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=Forma`,
  )) as { data?: Record<string, unknown>[] };
  return (body.data ?? []).slice(0, 20).map(mapAudius);
}

async function audiusTrending(mood?: string): Promise<Track[]> {
  const host = await audiusHost();
  const q = mood ? `genre=${encodeURIComponent(mood)}&` : "";
  const body = (await fetchJson(`${host}/v1/tracks/trending?${q}app_name=Forma`)) as {
    data?: Record<string, unknown>[];
  };
  return (body.data ?? []).slice(0, 20).map(mapAudius);
}

async function settled<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}

export const searchTracks = createServerFn({ method: "POST" })
  .validator((d: { query: string }) => d)
  .handler(async ({ data }) => {
    const q = data.query.trim() || "workout";
    const [dz, it, au] = await Promise.all([
      settled(deezerSearch(q)),
      settled(itunesSearch(q)),
      settled(audiusSearch(q)),
    ]);
    return dedupe([...(dz ?? []), ...(it ?? []), ...(au ?? [])]).slice(0, 40);
  });

export const trendingTracks = createServerFn({ method: "POST" })
  .validator((d: { mood?: string }) => d)
  .handler(async ({ data }) => {
    const mood = data.mood?.trim();
    if (mood && mood.toLowerCase() !== "latest") {
      const q = mood.toLowerCase() === "workout" ? "workout gym running" : mood;
      const [dz, it, au] = await Promise.all([
        settled(deezerSearch(q)),
        settled(itunesSearch(`${q} 2026`)),
        settled(audiusTrending(mood === "Workout" ? "Electronic" : mood)),
      ]);
      return dedupe([...(dz ?? []), ...(it ?? []), ...(au ?? [])]).slice(0, 40);
    }
    const [chart, fresh, gym, au] = await Promise.all([
      settled(deezerChart()),
      settled(itunesSearch("new music 2026")),
      settled(deezerSearch("workout hits")),
      settled(audiusTrending()),
    ]);
    return dedupe([...(chart ?? []), ...(fresh ?? []), ...(gym ?? []), ...(au ?? [])]).slice(0, 48);
  });

export const latestTracks = createServerFn({ method: "POST" })
  .handler(async () => {
    const [chart, fresh] = await Promise.all([settled(deezerChart()), settled(itunesSearch("top hits 2026"))]);
    return dedupe([...(chart ?? []), ...(fresh ?? [])]).slice(0, 36);
  });

export const resolveStream = createServerFn({ method: "POST" })
  .validator((d: { id: string; streamUrl?: string }) => d)
  .handler(async ({ data }) => {
    if (data.streamUrl) return { url: data.streamUrl };
    if (data.id.startsWith("deezer-") || data.id.startsWith("itunes-")) {
      return { url: "" };
    }
    const id = data.id.replace(/^audius-/, "");
    const host = await audiusHost();
    return { url: `${host}/v1/tracks/${encodeURIComponent(id)}/stream?app_name=Forma` };
  });

export const listPlaylists = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql`select * from playlists where user_id = ${context.userId} order by created_at desc`;
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      isWorkout: r.is_workout === true,
      tracks: (typeof r.tracks_json === "string" ? JSON.parse(String(r.tracks_json)) : r.tracks_json) as Track[],
    }));
  });

export const savePlaylist = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { name: string; tracks: Track[]; isWorkout?: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = uid();
    await sql.query(
      `insert into playlists (id, user_id, name, is_workout, tracks_json) values ($1,$2,$3,$4,$5::jsonb)`,
      [id, context.userId, data.name, data.isWorkout ?? false, JSON.stringify(data.tracks)],
    );
    return { id };
  });
