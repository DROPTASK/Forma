# Extended Feature Specifications
## (Deeper requirements not fully detailed in the PRD)

This doc drills into screens, data models, and edge cases for the features that need more than a one-paragraph MVP description.

---

## 1. Exercise Tracking — Full Spec

### Data Model
```
Exercise { id, name, muscleGroups: string[], equipment, isCustom, instructions? }
WorkoutSession { id, date, startTime, endTime, notes }
SetLog { id, sessionId, exerciseId, setNumber, reps, weightKg, rpe?, restSeconds? }
```

### Screens
- **Exercise Library** — searchable/filterable list (by muscle group, equipment), tap to see history + "Add to session."
- **Active Session** — running timer, current exercise, set-by-set input (weight/reps), rest timer auto-starts after a set is logged, "+ Add Exercise" mid-session.
- **Exercise Detail/History** — line chart of max weight & est. 1RM over time (Epley formula: `weight × (1 + reps/30)`), volume-per-week bar chart.

### Edge Cases
- Superset/circuit logging (multiple exercises, no rest between) — allow session to log sets out of strict single-exercise order.
- Bodyweight exercises — `weightKg` optional, track reps only, or `weightKg = bodyweight + added`.
- Unit preference (kg/lb) — global setting, stored raw in kg, converted for display.

---

## 2. Weight Tracker — Full Spec

### Data Model
```
WeightEntry { id, date, valueKg, source: "manual"|"ble", bodyFatPct?, deviceName? }
```

### Screens
- **Log screen** — quick-add manual entry, or shows "last BLE reading" with a one-tap confirm.
- **Trend screen** — line chart with: raw entries, 7-day moving average (smooths daily fluctuation noise), goal-weight horizontal line, % change over selectable range (7/30/90/all days).

### Edge Cases
- Multiple entries same day → keep all, moving average uses latest-per-day.
- Goal weight can be a range (e.g., 68–70 kg) not just a single number.

---

## 3. Daily Record Creator — Full Spec

### Data Model
```
DailyRecord { date (PK), mood?, notes?, aiSummary?, workoutIds[], mealIds[], weightEntryId? }
```

### Behavior
- Auto-populated fields (workouts, meals, weight) are pulled by date, read-only references — not duplicated data.
- User-editable: mood (simple 1–5 or emoji scale), free-text notes.
- "Ask AI to summarize" button sends the day's aggregated stats to the AI proxy, returns a short recap saved into `aiSummary` (cached — regenerating requires explicit user action, not automatic, to control API cost).

---

## 4. Challenges / Streaks — Full Spec

### Data Model
```
Challenge { id, title, type: "streak"|"duration", targetDays, startDate, endDate?, dailyTaskDescription }
CheckIn { id, challengeId, date, completed: boolean }
```

### Screens
- **Create Challenge** — title, duration (or open-ended streak), daily task text, optional reminder time.
- **Challenge Detail** — calendar heatmap (GitHub-contributions style), current streak count, longest streak, completion %.
- **Streak-at-risk notification** — if no check-in by e.g. 8 PM and challenge is active, fire a reminder (via shared notification scheduler).

### Edge Cases
- Grace period setting (allow 1 missed day per week without breaking streak) — optional toggle per challenge.
- Multiple concurrent challenges — dashboard shows all active streak counts as small badges.

---

## 5. Meal Tracker — Full Spec

### Data Model
```
FoodItem { id, name, caloriesPer100g, proteinG, carbsG, fatG, source: "local"|"ai-parsed"|"custom" }
MealEntry { id, date, mealType: "breakfast"|"lunch"|"dinner"|"snack", foodItemId, quantityG, aiParsedFrom? }
```

### Screens
- **Daily Log** — grouped by meal type, running total vs. calorie/macro goals (ring/bar progress).
- **Add Meal** — search local food DB, manual entry, OR type free text ("2 eggs and toast") → "Ask AI" parses into one or more `FoodItem` + `MealEntry` rows via the `addMeal` AI tool — user confirms before it saves.
- **Macro summary** — daily/weekly stacked bar of protein/carb/fat.

### Edge Cases
- AI-parsed items should be flagged distinctly in the log (small "AI estimated" tag) so users know nutrition values are approximate, not from a verified database.
- Local food DB: ship a bundled static subset (e.g., common foods, a few thousand entries) so search works fully offline; AI parsing is the fallback for anything not found.

---

## 6. Timetable Tracker — Full Spec

### Data Model
```
TimetableBlock { id, dayOfWeek | specificDate, startTime, endTime, title, category: "workout"|"meal"|"sleep"|"other", reminderMinutesBefore? }
```

### Screens
- **Weekly Grid** — 7-day × time-of-day grid, color-coded by category, tap a slot to add/edit.
- **Day View** — vertical agenda list, easier for small screens.
- AI can bulk-create via chat: "set up my week — gym Mon/Wed/Fri 6am, meals at 8/1/7" → one `scheduleTimetableBlock` call per block via the AI action layer.

---

## 7. Diet Creator — Full Spec

### Flow
1. Form: goal (bulk/cut/maintain), daily calorie target (or "calculate for me" using TDEE from logged weight/height/activity), diet type (omnivore/veg/vegan/keto/etc.), allergies/exclusions, meals/day.
2. AI call (`generateDietPlan` tool) returns a structured multi-day plan: `{ days: [{ day, meals: [{ mealType, items: [{name, qty, calories, protein, carbs, fat}] }] }] }`.
3. User can edit any meal manually afterward, or hit "Regenerate this meal only" (scoped re-prompt, cheaper than regenerating the whole plan).
4. "Apply to Timetable" — one tap creates timetable blocks + pre-fills meal tracker entries for the plan's dates.

### Edge Cases
- Always show total daily calories/macros per generated day so the user can sanity-check before saving — AI nutrition math should be treated as a first draft, not ground truth.

---

## 8. Muscle Map — Full Spec

### Data Model
- Static asset: `muscleMap.svg` with `<path id="chest">`, `<path id="lats">`, etc. (front + back variants).
- Derived at render time: `muscleVolume7d[muscleGroup] = sum(sets × reps × weight)` from `SetLog` joined through `Exercise.muscleGroups`.

### Screens
- **Muscle Map** — toggle front/back, color scale (e.g., gray = untrained this week → deep color = high volume), tap muscle → bottom sheet listing exercises trained + "browse more exercises for this muscle."

---

## 9. Camera Body Measurement — Implementation Detail

### State Machine
```
IDLE → SCANNING (camera live, running pose model each frame)
     → ALIGNING (person detected but not centered/full-body — show on-screen guidance text/arrows)
     → HOLDING (good alignment, landmarks stable — show countdown "Hold still... 3..2..1")
     → CAPTURED (frame frozen, computing measurements)
     → RESULT (show measurements, "Retake" or "Save")
```

### Guidance UI
- Silhouette outline overlay on camera preview the user aligns to.
- Real-time text hints: "Step back," "Move left," "Stand up straight," "Full body not visible."

### Output Fields (v1, width/length-based — see PRD honesty note)
`shoulderWidthCm, armLengthCm (L/R), torsoLengthCm, legLengthCm (L/R), hipWidthCm, estimatedWaistWidthCm, estimatedChestWidthCm`

### Trend View
- `BodyMeasurementSnapshot { date, heightUsedCm, all fields above, photoRef? (optional, local-only) }`
- Line charts per field over time, same visual language as Weight Tracker for consistency.

---

## 10. Notification Center — Full Spec

### Data Model
```
NotificationRule { id, category: "todo"|"timetable"|"meal"|"workout"|"streak"|"weighin", enabled, defaultTime? }
ScheduledNotification { id, ruleId, sourceEntityId, fireDate, title, body }
```

### Settings Screen
- One master toggle, plus per-category toggles and default reminder-time pickers.
- "Quiet hours" range (no notifications fire during, e.g., 11pm–7am) applied globally.

---

## 11. AI Chat — Full Spec

### Screen
- Standard chat UI (bubbles), with a persistent input bar that also supports the same "Ask AI" affordance elsewhere.
- When AI responds with a tool call, show a small inline **confirmation card** ("Log: 2 eggs, 140 kcal — Add?") rather than silently writing to the DB — keeps the user in control and avoids AI mistakes silently corrupting data. User taps Confirm/Edit/Cancel.
- Chat history stored locally per day/session; "Clear chat" available in settings.

### Cost/Safety Controls
- Debounce rapid repeated calls.
- Cap max tool calls per single user message (e.g., 5) to avoid runaway loops.
- Every write-action tool call requires the confirmation card above — no silent multi-record writes without user sign-off, especially early on while trust in the feature is being built.
