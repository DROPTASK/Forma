# Tech Stack Document

Constraint driving every choice below: **VS Code only, no Android Studio, free-tier tools.**

---

## 1. Core Framework Decision

**React Native + Expo (with EAS Build), not Flutter, not native Kotlin.**

Why:
- Expo's managed workflow + **EAS Build** compiles your `.apk` in Expo's cloud — you never install the Android SDK or open Android Studio. You just run a CLI command from VS Code's terminal.
- Free tier: EAS Build gives limited free builds/month (enough for a solo dev iterating).
- Huge plugin ecosystem for exactly the native features you need (BLE, camera, notifications).

**Important nuance:** BLE and on-device camera/ML pose detection need **native modules**, which means you cannot use plain "Expo Go" app for testing — you need an **EAS Development Build** (a custom version of Expo Go with your native modules baked in). This is still VS Code + CLI only, no Android Studio required, just a slightly different `expo` command and a cloud build step. Covered in the Dev Setup doc.

---

## 2. Frontend

| Layer | Choice | Notes |
|---|---|---|
| Framework | React Native (Expo, TypeScript) | Type safety matters a lot once AI is writing/reading structured data |
| Navigation | `react-navigation` (stack + bottom tabs) | Standard, free |
| State management | `zustand` | Lightweight, easy for AI-action-layer to dispatch into |
| Local DB | `expo-sqlite` (or `WatermelonDB` if data grows complex) | Offline-first; source of truth on-device |
| Forms | `react-hook-form` | Pairs well with per-field "Ask AI" buttons |
| Charts | `victory-native` or `react-native-gifted-charts` | Weight trend, calorie trend, exercise progress |
| Animations/UI polish | `moti` + `react-native-reanimated` | For "Advanced UI" feel |
| Icons | `lucide-react-native` or `@expo/vector-icons` | Free |
| SVG (muscle map) | `react-native-svg` | Renders interactive tappable body diagram |
| Camera | `expo-camera` | Frame capture, live preview |
| Pose detection | `@tensorflow/tfjs-react-native` + `@tensorflow-models/pose-detection` (MoveNet) OR `react-native-mlkit` (ML Kit Pose Detection) | On-device, free, no server cost |
| Bluetooth | `react-native-ble-plx` | Standard BLE GATT read for scales |
| Notifications | `expo-notifications` | Local scheduled notifications, free |
| Secure storage | `expo-secure-store` | API keys / tokens |

## 3. AI Layer

| Component | Choice |
|---|---|
| LLM Provider | **Groq API** (as specified) — fast inference, free/cheap tier, OpenAI-compatible chat completions format |
| Models | Groq-hosted Llama 3.x (e.g., `llama-3.3-70b-versatile` for complex generation like diet plans; a smaller/faster model for quick field-fills) |
| Pattern | **Function/tool calling** — define JSON-schema "tools" (`addMeal`, `addWorkout`, `createChallenge`, `generateDietPlan`, `fillField`, etc.). Groq's API supports OpenAI-style tool calling. The app executes whatever function the model calls against local state/DB. |
| Where it runs | **Never call Groq directly from the app with the API key embedded** — proxy through a tiny backend (see §4) so the key isn't exposed in the APK (an APK can always be decompiled/unzipped). |

## 4. Backend (thin, mostly a secure proxy + sync)

Given "no Android Studio, free stuff only," keep the backend as light as possible.

| Option | Recommendation |
|---|---|
| **Recommended: Firebase** (Firestore + Auth + Cloud Functions) | Free Spark tier; Cloud Functions can host the one endpoint that proxies Groq calls (keeps your Groq key server-side); Firestore optional for cross-device sync/backup of local-first data; Firebase Auth for login. All free-tier, no server to manage. |
| Alternative: Node.js + Express on a free host (Render/Railway free tier) | More control, but you now manage a server; only worth it if you outgrow Firebase Functions' limits. |

**Data philosophy: local-first.** SQLite on-device is the source of truth for speed/offline use; Firestore (if used) is a background sync/backup layer, not the primary read path. This also minimizes backend cost/complexity.

## 5. Dev Tooling (all VS Code-compatible, free)

| Tool | Purpose |
|---|---|
| VS Code + extensions: `React Native Tools`, `ESLint`, `Prettier`, `Expo Tools` | Editor setup |
| Node.js (LTS) + npm/yarn | Package management |
| Expo CLI (`npx expo ...`) | Project scaffolding, dev server |
| EAS CLI (`npx eas-cli`) | Cloud builds (APK/AAB) — **replaces Android Studio entirely** |
| Expo Orbit or physical Android phone via USB/Wi-Fi + Expo Dev Client app | Live testing without an emulator (no Android Studio = no built-in emulator, so testing on a real phone is the path of least resistance) |
| Git + GitHub (free) | Version control |
| EAS Update (OTA) | Push JS-only updates without a full rebuild |

## 6. Testing on a Real Device Without Android Studio

- Install the **Expo Dev Client** build (from your own EAS build) on your Android phone via a downloaded APK or QR code.
- `npx expo start --dev-client` runs a dev server in VS Code's terminal; the phone connects over Wi-Fi/USB and hot-reloads your JS changes instantly — no emulator needed at all.
- Android SDK Platform Tools (`adb`) alone (a small free download, not Android Studio) is useful for USB debugging/logs, but strictly optional.

## 7. Body Measurement ML — Two Viable Approaches

| Approach | Pros | Cons |
|---|---|---|
| **A. On-device pose landmarks + geometric ratio math** (MoveNet/ML Kit) | Fully free, offline, fast, no server cost | Only gives widths/lengths accurately, not true circumference (see PRD §7.3) |
| **B. Server-side model (e.g., a hosted body-measurement API or a custom-trained regression model)** | Can be more accurate, can estimate circumference from front+side pair | Costs money/complexity, needs a backend, most third-party body-measurement APIs are paid |

**Recommendation:** Ship v1 with Approach A + clear "estimate" framing; revisit Approach B only if accuracy demand grows.

## 8. Summary Diagram

```
[ React Native (Expo) App — VS Code + EAS CLI ]
   ├─ expo-sqlite (local-first data)
   ├─ react-native-ble-plx (scale/watch BLE)
   ├─ expo-camera + tfjs pose-detection (body measurement)
   ├─ expo-notifications (all reminders)
   ├─ react-native-svg (muscle map)
   └─ AI Action Layer ──HTTPS──> Firebase Cloud Function (proxy)
                                        └──> Groq API (tool-calling)
                     (optional) <──sync──> Firestore (backup/cross-device)
```
