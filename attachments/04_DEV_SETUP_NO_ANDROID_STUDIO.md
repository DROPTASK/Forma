# Dev Setup — VS Code Only, No Android Studio

## 1. One-Time Installs (all free)

1. **Node.js (LTS)** — from nodejs.org.
2. **VS Code** extensions: `React Native Tools`, `ESLint`, `Prettier`, `Expo Tools` (optional but nice).
3. **Git** + a free GitHub account (for version control / backup).
4. **Expo account** (free) — needed for EAS Build.
5. **Firebase account** (free Spark tier) — for the AI proxy function + optional Firestore sync.
6. **Groq API key** (free tier) from console.groq.com.
7. A physical Android phone (for testing — replaces the emulator Android Studio would normally give you).

You do **not** need: Android Studio, a local Android SDK, or a local emulator.

## 2. Project Bootstrap

```bash
npx create-expo-app fitness-tracker -t expo-template-blank-typescript
cd fitness-tracker
npx expo install expo-camera expo-notifications expo-sqlite expo-secure-store react-native-svg
npm install zustand react-hook-form @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-ble-plx
npm install @tensorflow/tfjs @tensorflow/tfjs-react-native @tensorflow-models/pose-detection
```

(Some native modules like `react-native-ble-plx` require a **development build**, not Expo Go — that's step 4 below.)

## 3. EAS CLI Setup (this replaces Android Studio)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

This generates an `eas.json`. Add a `development` profile (for your custom dev client) and a `preview`/`production` profile (for shareable/final APKs):

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

## 4. Build Your Custom Dev Client (once, or whenever native deps change)

```bash
eas build --profile development --platform android
```

This runs entirely in Expo's cloud. When it finishes, it gives you a **QR code / download link** — open that link on your Android phone, download, and install the APK directly (enable "install from unknown sources" once). This is now your personal Expo Go replacement, with BLE/camera/pose-detection support baked in.

## 5. Daily Dev Loop (from VS Code terminal)

```bash
npx expo start --dev-client
```

- Scan the QR shown in the terminal with your phone (already running your dev client build).
- Edit code in VS Code → save → app hot-reloads on your phone instantly.
- You never touch Android Studio at any point in this loop.

## 6. Re-Build the Dev Client

Only needed when you **add/change a native module** (e.g., install a new native library). For everyday JS/TS/React changes, the hot-reload loop above is all you need.

## 7. Producing a Real Installable APK for Yourself/Testers

```bash
eas build --profile preview --platform android
```

Downloadable `.apk` link appears when the cloud build finishes — install directly on any Android phone, no Play Store needed.

## 8. Firebase Cloud Function (Groq Proxy) — Minimal Setup

```bash
npm install -g firebase-tools
firebase login
firebase init functions   # choose JavaScript or TypeScript, free Spark plan
```

In `functions/index.js` (conceptually):
- One HTTPS callable function `askAI` that:
  1. Receives `{ messages, tools }` from the app.
  2. Calls Groq's chat completions endpoint server-side using an API key stored in `firebase functions:config:set groq.key="..."` (or Secret Manager).
  3. Returns Groq's response (text or tool_call) back to the app.

Deploy:
```bash
firebase deploy --only functions
```

The app only ever talks to your Firebase function URL — it never holds the Groq key.

## 9. Free-Tier Watch List

| Service | Free tier limit to watch |
|---|---|
| EAS Build | Limited builds/month on free plan — batch your native-dependency changes so you rebuild the dev client rarely, not on every commit |
| Firebase Functions (Spark) | Free invocations/month — fine for solo dev/testing, monitor usage if this becomes multi-user |
| Groq API | Check current free-tier rate limits on console.groq.com; add client-side debounce on "Ask AI" buttons to avoid burning quota on every keystroke |
| Firestore | Free reads/writes/storage quota — local-first design (§Architecture) keeps you well under this |

## 10. Suggested First Milestone to Prove the Pipeline

Before building any feature, do a "hello world" round trip to prove the whole toolchain works:
1. Scaffold app → runs in dev client on your phone.
2. One button that calls the Firebase `askAI` function → Groq → displays response.
3. One EAS `preview` build → install the `.apk` on your phone outside the dev loop.

Once all three work, every feature in the PRD is just "more of the same pattern."
