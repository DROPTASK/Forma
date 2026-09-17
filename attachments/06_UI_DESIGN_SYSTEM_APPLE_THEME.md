# UI Design System — "Apple-Style" Aesthetic

Goal: give this Android app the clean, spacious, translucent, high-contrast feel of iOS/Apple's own apps (Health, Fitness, Wallet) — without literally using Apple's trademarked SF Symbols/San Francisco font (those are Apple-licensed; on Android use close-feel free alternatives, noted below).

---

## 1. Design Principles (what "feels Apple")

1. **Lots of whitespace, generous padding** — content breathes, never edge-to-edge cramped.
2. **Large, bold section titles**, smaller secondary text — strong type hierarchy.
3. **Rounded corners everywhere** — cards, buttons, sheets (continuous "squircle" curvature, not plain CSS border-radius rectangles, where feasible).
4. **Translucency/blur** — frosted-glass nav bars, tab bars, and modal sheets over content (Apple's signature "material" look).
5. **Subtle depth, not flat** — soft shadows, layered cards, no heavy borders/lines to separate content — spacing does that job instead.
6. **Restrained color** — mostly neutral (white/black/gray) surfaces, color reserved for one accent + data visualization (rings, charts) and semantic states (success/warning/error).
7. **Motion with purpose** — spring-based transitions, subtle scale/opacity on tap, sheet slide-ups — never abrupt.
8. **Bottom sheets over full-screen modals** for quick actions (add meal, add workout) — mirrors iOS interaction patterns.

---

## 2. Color System

### Light Mode
| Token | Value | Use |
|---|---|---|
| `bg.primary` | `#F2F2F7` | Screen background (iOS "systemGroupedBackground") |
| `bg.card` | `#FFFFFF` | Cards, sheets |
| `bg.elevated` | `#FFFFFF` with shadow | Modals |
| `text.primary` | `#1C1C1E` | Main text |
| `text.secondary` | `#6E6E73` | Captions, metadata |
| `separator` | `#E5E5EA` | Hairlines (used sparingly) |
| `accent` | `#0A84FF` (iOS blue) *or pick app-specific accent, see §2.3* | Primary actions, links, active states |

### Dark Mode
| Token | Value |
|---|---|
| `bg.primary` | `#000000` |
| `bg.card` | `#1C1C1E` |
| `bg.elevated` | `#2C2C2E` |
| `text.primary` | `#FFFFFF` |
| `text.secondary` | `#8E8E93` |
| `separator` | `#38383A` |
| `accent` | `#0A84FF` |

### Semantic Colors (both modes)
| Token | Value | Use |
|---|---|---|
| `success` | `#30D158` | Streak kept, goal hit |
| `warning` | `#FF9F0A` | Streak at risk, over calorie goal |
| `danger` | `#FF453A` | Delete, missed critical reminder |
| `info` | `#5E5CE6` | AI-related highlights (badge on "Ask AI" affordance) |

### 2.3 Fitness-Ring Accent Palette (for muscle map / dashboard rings, à la Apple Fitness "move/exercise/stand" rings)
- Ring 1 (e.g., Calories): `#FF375F`
- Ring 2 (e.g., Exercise): `#30D158`
- Ring 3 (e.g., Workout streak): `#0AF5FF` → use as concentric progress rings on the Dashboard, directly mirroring the Apple Watch Activity ring pattern.

---

## 3. Typography

Apple's San Francisco font is proprietary to Apple platforms — closest free/open lookalikes for Android/React Native:

| Priority | Font | Why |
|---|---|---|
| 1st choice | **Inter** | Nearly identical metrics/feel to SF Pro, free (Google Fonts / `@expo-google-fonts/inter`), excellent at small sizes |
| 2nd choice | **SF Pro Rounded look-alike: "Outfit" or "Manrope"** | For a friendlier rounded-display-style heading font, if you want extra warmth on big numbers (e.g., calorie ring center text) |

### Type Scale (matches iOS Human Interface Guidelines proportions)
| Style | Size / Weight | Use |
|---|---|---|
| Large Title | 34 / Bold | Screen headers (Dashboard, "Today") |
| Title 1 | 28 / Bold | Section headers |
| Title 2 | 22 / Semibold | Card titles |
| Headline | 17 / Semibold | List item titles, buttons |
| Body | 17 / Regular | Primary content |
| Subhead | 15 / Regular | Secondary content |
| Footnote | 13 / Regular | Captions, timestamps |
| Caption | 12 / Regular | Fine print, disclaimers |

---

## 4. Spacing & Layout

- Base unit: **4pt grid** (4, 8, 12, 16, 20, 24, 32, 40...).
- Screen horizontal padding: **16–20pt**.
- Card internal padding: **16pt**.
- Card corner radius: **16–20pt** (large, soft — iOS cards trend toward bigger radii than typical Android Material cards).
- Gap between stacked cards: **12pt**.
- Tab bar height: **~49pt content + safe area**, frosted blur background.

---

## 5. Core Components

| Component | Apple-style spec |
|---|---|
| **Card** | White/dark surface, 16–20pt radius, soft shadow (`0 2px 12px rgba(0,0,0,0.06)` light / stronger opacity dark), no hard border |
| **Button (Primary)** | Full-width or pill, accent-filled, 12–14pt vertical padding, 14pt radius, semibold label, subtle scale-down (0.97) on press |
| **Button (Secondary)** | Tinted background (accent at 12% opacity), accent-colored text, same radius |
| **Segmented Control** | iOS-style pill-shaped multi-option switch (e.g., Day/Week/Month toggle on charts) — grouped track with a sliding highlighted pill |
| **List Row** | Leading icon in a soft rounded-square tint background (like iOS Settings rows), title + optional subtitle, trailing chevron/value, hairline separator only between rows (inset, not full-bleed) |
| **Progress Ring** | Circular, thick stroke, rounded line caps, animated fill — used for calorie/macro/workout-streak summaries |
| **Bottom Sheet** | Rounded top corners (20pt+), drag handle bar at top, frosted blur backdrop behind it, spring-up animation |
| **Tab Bar** | Frosted/blurred translucent background, icon + label, active tab in accent color, others in `text.secondary` |
| **Nav Bar** | Large title collapsing to small title on scroll (iOS large-title pattern), blurred background once content scrolls under it |
| **Toggle Switch** | iOS-style pill switch, green/accent when on |
| **Ask-AI Affordance** | Small pill/icon button (sparkle icon) inline at the end of a field or section header, `info` accent tint, opens a small AI input sheet |
| **Streak Calendar** | Rounded-square heatmap cells (like GitHub contributions but with 8–10pt radius per cell, Apple-soft not sharp) |
| **Empty States** | Centered icon (soft tinted circle background) + short headline + one-line caption + single primary action button — never a blank screen |

---

## 6. Iconography

- Since SF Symbols are Apple-licensed and not usable on Android apps, use a single consistent free icon set for a unified "symbol" feel:
  - **Primary recommendation:** `lucide-react-native` — thin, consistent stroke weight, rounded joins, closest free equivalent to SF Symbols' visual language.
  - Keep stroke width consistent across the whole app (Lucide defaults to this) — mixing icon sets breaks the "designed by one hand" feel Apple is known for.
- Icon sizing: 20pt (inline/list), 24pt (tab bar), 28–32pt (feature headers/empty states).
- Icons sit inside soft rounded-square tinted backgrounds for list rows (mirrors iOS Settings app), color-coded per feature (e.g., orange for meals, blue for exercise, purple for AI).

---

## 7. Motion Guidelines

| Interaction | Motion |
|---|---|
| Screen push | Slide-in from right, spring easing |
| Sheet present | Slide up from bottom + backdrop fade-in |
| Button press | Scale to 0.97 + slight opacity dip, spring back on release |
| Tab switch | Cross-fade content, icon/label color transition |
| Progress ring fill | Ease-out animate from 0 to value on screen focus |
| Toast/confirmation ("Meal added") | Slide down from top, auto-dismiss with fade |
| List item delete (swipe) | iOS-style swipe-to-reveal red delete action |

Implementation: `react-native-reanimated` + `moti` for spring-based transitions; `expo-blur` for the frosted-glass nav/tab bar/sheet backgrounds.

---

## 8. Dark Mode

- Full parity dark theme required (Apple apps always ship both) — implement via the `theme` token file so every component reads `bg.primary`, `text.primary` etc. rather than hardcoded hex values.
- Respect system theme by default (`Appearance.getColorScheme()`), with a manual override in Settings (Light/Dark/System — exactly like iOS's own toggle).

---

## 9. Example: Dashboard Layout (putting it together)

```
[ Large Title: "Today" ]                     ← collapses on scroll
[ 3 concentric Activity-style rings: Calories / Exercise / Streak ]
[ Card: Weight — mini trend line + "68.2 kg, -0.4 this week" ]
[ Card: Today's Meals — ring showing calories vs goal, "Add meal" pill button with sparkle Ask-AI icon ]
[ Card: Workout — "Push Day scheduled 6:00 PM" + Start button ]
[ Card: Active Challenges — horizontal scroll of streak badges ]
[ Frosted tab bar: Today | Train | Eat | Body | More ]
```

This single screen demonstrates nearly every pattern above: rings, cards, soft radii, accent color restraint, frosted tab bar, and an inline AI affordance — use it as the template to extend to every other screen in the app.
