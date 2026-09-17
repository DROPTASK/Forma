# Feature Spec — In-App Music Player
## (Bluetooth/external speaker + built-in speaker playback, free music API)

---

## 1. Overview

A built-in music player for workout sessions (and general use) that streams from a **free music API**, with playback routed to whatever audio output is active — phone's built-in speaker, or a paired Bluetooth speaker/headphones — with a persistent Apple Music-style mini-player docked across the app.

**Important clarification on "connection to external device":** routing audio to a Bluetooth speaker/headphones is **handled by Android itself (A2DP profile)**, not something the app has to implement — once the user pairs a BT speaker in phone Settings (or your app deep-links them there), any audio the app plays automatically comes out of that device. The app's job is: (1) play audio well, (2) show *which* output is currently active, (3) optionally offer a quick output-switch shortcut. This is a completely separate Bluetooth mechanism from the BLE scale connection covered earlier (BT Classic/A2DP audio vs. BLE data) — no overlap in code.

---

## 2. Free Music API Options (comparison)

| API | Free? | Full tracks or previews? | Notes |
|---|---|---|---|
| **Audius** | Yes, fully free, no API key required, open-source protocol | **Full tracks**, streamable directly | Independent-artist platform; best fit for "any free API" — simplest integration, direct stream URLs, generous public API |
| **Jamendo** | Yes, free API key | **Full tracks** (Creative Commons/independent catalog) | Good royalty-free catalog, well-documented REST API, free tier is generous |
| **Deezer API** | Yes, free | **30-second previews only** | Mainstream catalog (major-label songs) but playback is preview-only without a paid Deezer partnership |
| **Spotify Web API + App Remote SDK** | Free to integrate | Full tracks, but **only playable by controlling the user's own Spotify app** (not raw stream URLs) — requires the user to have Spotify installed | Mainstream catalog, but this is "remote control of Spotify," not audio you stream yourself — heavier native SDK integration |
| **YouTube (unofficial)** | Not a real free API — scraping-based, breaks often | Full tracks | **Not recommended** — against YouTube ToS, fragile, risk of takedown |

### Recommendation
- **Primary (v1): Audius API** — genuinely free, no key, full-length streams, simple REST endpoints (`/v1/tracks/search`, `/v1/tracks/{id}/stream`), perfect for a workout-playlist feature without licensing complexity.
- **Optional (v2, stretch goal): Spotify Connect integration** — for users who want their own mainstream Spotify library/playlists controlled from inside the app (adds real dev complexity — separate native module, Spotify Premium required for full control — treat as a "nice to have," not MVP).
- Skip Deezer/YouTube for actual playback — previews are too short for a workout session, and YouTube scraping is a legal/stability risk.

---

## 3. Data Model

```
Track {
  id, title, artistName, artworkUrl, durationSec,
  streamUrl,            // resolved from Audius API at play-time
  source: "audius" | "jamendo" | "local-cache"
}

Playlist {
  id, name, trackIds: string[], isWorkoutPlaylist: boolean,
  linkedChallengeId? | linkedWorkoutType?   // e.g. auto-play for "Push Day"
}

PlaybackState (in-memory + persisted for resume) {
  currentTrackId, queue: string[], positionSec, isPlaying,
  repeatMode: "off"|"one"|"all", shuffle: boolean,
  activeOutputDeviceName   // read from OS audio route info, display-only
}
```

---

## 4. Screens

### 4.1 Mini-Player (persistent, docked above the tab bar — Apple Music pattern)
- Small artwork thumbnail, track title/artist (marquee scroll if long), play/pause, tap anywhere else on the bar → expands to Full Player.
- Frosted-blur background per the app's Apple-style design system (`06_UI_DESIGN_SYSTEM_APPLE_THEME.md`).

### 4.2 Full Player (bottom sheet or full screen, swipe down to dismiss)
- Large artwork, title/artist, scrubber with elapsed/remaining time, play/pause/skip/prev, shuffle/repeat toggles.
- **"Playing on: [Device Name]"** row — reads current Android audio output route, tapping it opens the system Bluetooth/output picker (Android's native `AudioManager`/output-switcher intent) rather than the app trying to manage BT pairing itself.
- Queue view (swipe up or a button) — reorderable list of upcoming tracks.

### 4.3 Browse/Search
- Search bar (hits Audius search endpoint), genre/mood shelves (e.g., "Workout," "Focus," "Chill") built from curated Audius playlists or tag-based search (Audius supports mood/genre tags).
- "Workout Playlists" section — user-curated or auto-suggested playlists tagged for linking to workout types.

### 4.4 Integration Point: Workout Session Screen
- Small "🎵 Play [Playlist Name]" chip at the top of an Active Workout Session (from `05_EXTENDED_FEATURE_SPECS.md` §1) — one tap starts the linked playlist and docks the mini-player, so music and workout logging live on the same screen without leaving it.

---

## 5. Architecture / Playback Engine

```
/src/music
  api/
    audiusClient.ts       // search, get stream URL, get trending/genre playlists
  player/
    playerEngine.ts       // wraps expo-audio (or expo-av) — load/play/pause/seek/queue
    outputRoute.ts         // reads current audio output name for display (Android AudioManager info)
  state/
    playerStore.ts         // zustand store: PlaybackState, exposed to mini-player + full player
  screens/
    MiniPlayer.tsx
    FullPlayerSheet.tsx
    BrowseScreen.tsx
    PlaylistDetailScreen.tsx
```

- **Playback library:** `expo-audio` (Expo's modern audio API, replacing the older `expo-av` Audio module) — supports background playback, works fine inside an EAS dev-client build, no Android Studio needed (consistent with the rest of the stack).
- **Background/lock-screen playback + media controls:** configure `expo-audio`'s background audio mode plus Android media-session metadata so play/pause/skip appear on the lock screen and any connected Bluetooth headset's hardware buttons — this is what makes it feel like a "real" music app rather than an embedded audio tag.
- **Audius stream resolution:** call `GET /v1/tracks/{id}/stream` (redirects to an actual audio file URL) at play-time rather than caching stream URLs long-term — they can expire/rotate across Audius's node network.
- **Offline caching (optional, later):** cache a small number of recently played tracks' audio locally (`expo-file-system`) for gym environments with poor signal — respects each track's Audius/Jamendo licensing terms (both platforms' catalogs are generally fine for this kind of personal caching, but re-verify per-track license flags where provided by the API).

---

## 6. AI Layer Tie-In (consistent with the rest of the app)

Add one more action to the shared AI action registry (`03_ARCHITECTURE.md` §2):
```ts
registerAction("playWorkoutMusic", ({ mood, workoutType }) =>
  musicRepo.playSuggestedPlaylist({ mood, workoutType })
);
```
So the AI chat / "Ask AI" can do things like *"play something upbeat for leg day"* → searches Audius by tag/mood → starts playback — same confirmation-card pattern as other AI actions (§11 in the extended specs doc) isn't strictly needed here since starting music is low-risk/reversible, but a lightweight toast ("Now playing: ...") gives the same transparency.

---

## 7. Notifications Tie-In

- Optional: "Now Playing" persistent notification (standard Android media-style notification) while music plays in the background — reuses the OS's built-in media notification, not the app's custom notification scheduler.

---

## 8. Risks / Honest Caveats

1. **Audius/Jamendo catalogs are independent/CC-licensed, not mainstream chart music.** Users expecting "any Top 40 song" will be disappointed — set expectations in onboarding copy ("workout tracks from independent artists," not "your Spotify library") unless/until the optional Spotify Connect stretch goal is built.
2. **Spotify Connect (if added later)** requires the user to have the Spotify app installed and, for full playback control, a Spotify Premium account — free-tier Spotify accounts have API playback-control restrictions.
3. **Background audio + Bluetooth media-button handling** adds real native-module complexity — budget real time for this in Phase P6 (Polish) rather than treating it as trivial.
4. **No app can force-initiate a brand-new Bluetooth *pairing*** from scratch without the system picker — the "connect to external device" part of this feature is really "show/launch the system output picker," not a custom in-app BT pairing flow. Setting that expectation early avoids scope creep into rebuilding Android's own Bluetooth settings UI.

---

## 9. Suggested Build Slot

Insert as its own step in the milestone plan (`01_PRD.md` §8), after core trackers are stable:

| Phase | Addition |
|---|---|
| **P2.5 – Music** | Audius integration, mini/full player, background playback, output-device display, workout-session tie-in |
