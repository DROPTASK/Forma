# Architecture Document

## 1. High-Level App Structure (feature-first)

```
/app
  /src
    /screens
      /dashboard
      /exercise
      /weight
      /meals
      /timetable
      /diet
      /challenges
      /bodymeasure
      /musclemap
      /todo
      /settings
      /ai-chat
    /components         # shared UI: Button, Card, Chart, AIAssistButton, StreakCalendar...
    /ai
      client.ts         # calls the Firebase Function proxy, not Groq directly
      tools.ts          # JSON-schema tool definitions (the "actions" AI can call)
      actionRegistry.ts # maps tool name -> actual app function
    /ble
      scan.ts
      weightScaleService.ts   # parses GATT Weight Scale / Body Composition service
    /pose
      poseModel.ts      # loads MoveNet/ML Kit, returns landmarks
      measure.ts        # landmark distances -> cm using height reference
    /db
      schema.ts          # SQLite tables
      repositories/       # one file per feature: exerciseRepo, mealRepo, weightRepo...
    /notifications
      scheduler.ts        # single shared scheduling service, all features register here
    /state
      stores/              # zustand stores per feature
    /navigation
    /theme                 # design tokens: colors, spacing, typography
  App.tsx
```

## 2. The AI Action Layer (core of "AI edits everything")

This is the piece that makes "Ask AI on every field" and "AI chat that can create everything" both work off **one shared system**, instead of being built twice.

### 2.1 Pattern

1. Every feature module exposes a small number of pure functions to the action registry, e.g.:
   ```ts
   // actionRegistry.ts
   registerAction("addMeal", (args) => mealRepo.create(args));
   registerAction("addWorkout", (args) => exerciseRepo.logSet(args));
   registerAction("createChallenge", (args) => challengeRepo.create(args));
   registerAction("generateDietPlan", (args) => dietRepo.savePlan(args));
   registerAction("scheduleTimetableBlock", (args) => timetableRepo.create(args));
   registerAction("fillField", (args) => /* returns value to caller, doesn't write DB */);
   ```
2. `tools.ts` describes each action as a JSON-schema "tool" for the LLM (name, description, parameters) — this is sent to Groq on every AI call so the model knows what it's allowed to do.
3. When the user types into **any** "Ask AI" field or the global chat, the app sends: the user's message + the relevant tool subset + minimal context (e.g., current field's existing value, or recent logs) to the Firebase proxy → Groq.
4. Groq responds with either plain text (for the chat) or a `tool_call` (structured JSON). The app looks up the tool name in `actionRegistry` and executes it.
5. **Per-field "Ask AI"** is just this same flow scoped to one tool (e.g., a meal field only exposes `addMeal`/`fillField`), while the **global chat** exposes the full tool set.

### 2.2 Why this matters
- You write the "AI can create/edit X" logic **once per feature** (the action function), and both the field-level button and the global chat reuse it — instead of hand-building custom AI logic per screen.
- Adding a new feature later = register a new action + add it to `tools.ts`. The AI chat automatically gains the new capability.

## 3. Data Flow (local-first)

```
User action (manual OR via AI tool call)
        │
        ▼
  Repository function (db/repositories/*)
        │
        ▼
   SQLite (source of truth)
        │
        ▼
  Zustand store updates (read cache for UI)
        │
        ▼
   Screens re-render
        │
        ▼ (optional, background)
   Firestore sync (backup / cross-device)
```

## 4. BLE Weight Scale Flow

```
User taps "Connect Scale"
   → react-native-ble-plx scans for devices advertising
     Weight Scale Service UUID (0x181D) or Body Composition Service (0x181B)
   → user selects device → pair/connect
   → app subscribes to weight characteristic notifications
   → on notification: parse per GATT spec (units, decimal offset)
   → weightRepo.create({ value, source: "ble", timestamp })
   → Weight Tracker + Dashboard update automatically
Fallback: if no standard service found → prompt manual entry, still tag device name for future reference.
```

## 5. Camera Body Measurement Flow

```
Onboarding: user enters height (cm) — stored once, editable in Settings.

1. User opens Body Measurement screen → camera preview starts.
2. Every N ms: run pose model on current frame → get landmark array.
3. Frame-quality checker:
     - all key landmarks present & confidence > threshold
     - person roughly centered, full body in frame (ankles + head visible)
     - landmark positions stable across last ~1s (low variance) → "good moment"
4. On "good moment": capture frame + landmarks, freeze preview, show confirmation.
5. Compute scale factor: 
     pixel_height = distance(top_of_head_landmark, ankle_landmark_avg)
     cm_per_pixel = known_height_cm / pixel_height
6. Compute each measurement as landmark-to-landmark pixel distance × cm_per_pixel:
     shoulder width, arm length (shoulder→wrist via elbow), torso length,
     leg length, hip width, etc.
7. Display results with a persistent disclaimer: "Estimated from a photo — 
   circumference measurements (waist/chest/hip girth) are approximated from 
   width only and may differ from tape-measure results."
8. Save snapshot to bodyMeasurementRepo with date → shows trend over time.
```

## 6. Notification Scheduling (single shared service)

All modules (to-do, timetable, meal reminders, streak-at-risk, weigh-in reminders) call one function:

```ts
scheduler.schedule({
  id, title, body, triggerDate, repeat?: "daily"|"weekly", category
})
```

This wraps `expo-notifications`, keeps a registry of scheduled IDs so features can cancel/update their own notifications without stepping on each other, and the Settings screen lists/toggles by `category`.

## 7. Muscle Map Data Model

- Static SVG with named `<path>` groups per muscle (chest, lats, quads, biceps, etc.).
- Each exercise in the exercise library has a `muscleGroups: string[]` tag.
- Muscle Map screen queries: "sum of sets logged per muscle group in last 7 days" → maps intensity to a color scale → applies as `fill` color per SVG path at render time.
- Tap a muscle path → navigate to exercise library filtered by that muscle tag.

## 8. Security Notes

- Groq API key lives only in the Firebase Cloud Function's environment config — never bundled in the APK.
- `expo-secure-store` for any user auth tokens on-device.
- Body photos: process on-device only (pose model runs locally); do not upload raw photos to any server unless the user explicitly opts into cloud backup — state this clearly in a privacy note, since body photos are sensitive.
