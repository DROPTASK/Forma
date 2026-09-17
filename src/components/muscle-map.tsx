import { useState } from "react";
import { cn } from "@/lib/utils";

export const GROUPS = [
  "chest",
  "shoulders",
  "biceps",
  "triceps",
  "abs",
  "obliques",
  "lats",
  "upper_back",
  "traps",
  "lower_back",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "forearms",
] as const;

const LABELS: Record<string, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  abs: "Abs",
  obliques: "Obliques",
  lats: "Lats",
  upper_back: "Upper back",
  traps: "Traps",
  lower_back: "Lower back",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
  forearms: "Forearms",
};

export function MuscleMapView({
  volume,
  onSelect,
}: {
  volume: Record<string, number>;
  onSelect: (muscle: string) => void;
}) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...Object.values(volume));
  const fill = (g: string) => {
    const v = volume[g] ?? 0;
    const t = v / max;
    if (t <= 0) return "color-mix(in srgb, var(--app-fg) 10%, var(--app-separator))";
    return `color-mix(in srgb, var(--color-ring-move) ${Math.round(28 + t * 72)}%, var(--app-separator))`;
  };
  const active = hover;

  return (
    <div>
      <div className="mb-4 flex rounded-full bg-separator p-1">
        {(["front", "back"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={cn(
              "h-10 flex-1 rounded-full text-[15px] font-semibold capitalize",
              side === s ? "bg-card text-fg shadow-[var(--app-shadow)]" : "text-muted",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="relative">
        <svg
          viewBox="0 0 240 520"
          className="mx-auto block w-[min(100%,280px)]"
          role="img"
          aria-label={`${side} muscle map`}
        >
          {side === "front" ? (
            <Front fill={fill} onSelect={onSelect} hover={hover} setHover={setHover} />
          ) : (
            <Back fill={fill} onSelect={onSelect} hover={hover} setHover={setHover} />
          )}
        </svg>
        {active ? (
          <p className="absolute inset-x-0 -bottom-1 text-center text-[13px] font-semibold capitalize">
            {LABELS[active] ?? active.replace("_", " ")}
            {volume[active] ? ` · ${Math.round(volume[active])} kg` : ""}
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <div
          className="h-2 flex-1 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--app-fg) 10%, var(--app-separator)), var(--color-ring-move))",
          }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[12px] text-muted">
        <span>Untrained</span>
        <span>High volume</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {GROUPS.filter((g) => (side === "front" ? FRONT.has(g) : BACK.has(g))).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onSelect(g)}
            onMouseEnter={() => setHover(g)}
            onMouseLeave={() => setHover(null)}
            className="rounded-full bg-separator px-2.5 py-1 text-[11px] font-semibold capitalize text-muted"
          >
            {LABELS[g]}
          </button>
        ))}
      </div>
    </div>
  );
}

const FRONT = new Set(["chest", "shoulders", "biceps", "abs", "obliques", "quads", "calves", "forearms"]);
const BACK = new Set(["traps", "shoulders", "upper_back", "lats", "triceps", "lower_back", "glutes", "hamstrings", "calves"]);

function MusclePath({
  d,
  g,
  fill,
  onSelect,
  hover,
  setHover,
}: {
  d: string;
  g: string;
  fill: (g: string) => string;
  onSelect: (g: string) => void;
  hover: string | null;
  setHover: (g: string | null) => void;
}) {
  const on = hover === g;
  return (
    <path
      d={d}
      fill={fill(g)}
      stroke={on ? "var(--app-accent)" : "color-mix(in srgb, var(--app-fg) 18%, transparent)"}
      strokeWidth={on ? 2.4 : 0.8}
      className="cursor-pointer transition-[filter] duration-150"
      style={{ filter: on ? "brightness(1.08)" : undefined }}
      onClick={() => onSelect(g)}
      onPointerEnter={() => setHover(g)}
      onPointerLeave={() => setHover(null)}
    />
  );
}

function Front({
  fill,
  onSelect,
  hover,
  setHover,
}: {
  fill: (g: string) => string;
  onSelect: (g: string) => void;
  hover: string | null;
  setHover: (g: string | null) => void;
}) {
  const p = (d: string, g: string) => (
    <MusclePath d={d} g={g} fill={fill} onSelect={onSelect} hover={hover} setHover={setHover} />
  );
  return (
    <g>
      <ellipse cx="120" cy="36" rx="22" ry="24" fill="var(--app-elevated)" stroke="color-mix(in srgb, var(--app-fg) 16%, transparent)" strokeWidth="0.8" />
      <path d="M108 58 C112 70 128 70 132 58 L128 78 L112 78 Z" fill="var(--app-elevated)" />
      {p("M78 86 C88 70 104 74 120 78 C136 74 152 70 162 86 L170 118 C150 108 132 112 120 112 C108 112 90 108 70 118 Z", "shoulders")}
      {p("M92 112 C104 108 116 110 120 118 C124 110 136 108 148 112 L146 168 C136 176 124 178 120 176 C116 178 104 176 94 168 Z", "chest")}
      {p("M100 170 C110 168 118 170 120 176 C122 170 130 168 140 170 L138 232 C130 240 124 242 120 240 C116 242 110 240 102 232 Z", "abs")}
      {p("M78 118 C90 128 96 150 100 170 L102 230 C90 228 78 200 70 160 Z", "obliques")}
      {p("M162 118 C150 128 144 150 140 170 L138 230 C150 228 162 200 170 160 Z", "obliques")}
      {p("M70 118 C62 140 54 168 58 198 L76 188 C80 160 82 136 88 118 Z", "biceps")}
      {p("M170 118 C178 140 186 168 182 198 L164 188 C160 160 158 136 152 118 Z", "biceps")}
      {p("M58 198 C54 228 52 258 56 286 L74 272 C76 246 78 220 76 188 Z", "forearms")}
      {p("M182 198 C186 228 188 258 184 286 L166 272 C164 246 162 220 164 188 Z", "forearms")}
      {p("M102 232 C112 236 118 236 120 240 L118 360 C110 368 100 360 92 348 C90 300 94 260 102 232 Z", "quads")}
      {p("M138 232 C128 236 122 236 120 240 L122 360 C130 368 140 360 148 348 C150 300 146 260 138 232 Z", "quads")}
      {p("M92 348 C96 400 94 460 102 492 L118 478 C116 430 114 390 118 360 C108 358 96 352 92 348 Z", "calves")}
      {p("M148 348 C144 400 146 460 138 492 L122 478 C124 430 126 390 122 360 C132 358 144 352 148 348 Z", "calves")}
      <ellipse cx="56" cy="292" rx="10" ry="12" fill="var(--app-elevated)" />
      <ellipse cx="184" cy="292" rx="10" ry="12" fill="var(--app-elevated)" />
      <ellipse cx="104" cy="500" rx="14" ry="8" fill="var(--app-elevated)" />
      <ellipse cx="136" cy="500" rx="14" ry="8" fill="var(--app-elevated)" />
    </g>
  );
}

function Back({
  fill,
  onSelect,
  hover,
  setHover,
}: {
  fill: (g: string) => string;
  onSelect: (g: string) => void;
  hover: string | null;
  setHover: (g: string | null) => void;
}) {
  const p = (d: string, g: string) => (
    <MusclePath d={d} g={g} fill={fill} onSelect={onSelect} hover={hover} setHover={setHover} />
  );
  return (
    <g>
      <ellipse cx="120" cy="36" rx="22" ry="24" fill="var(--app-elevated)" stroke="color-mix(in srgb, var(--app-fg) 16%, transparent)" strokeWidth="0.8" />
      {p("M100 58 C110 78 130 78 140 58 L148 92 C136 86 124 90 120 92 C116 90 104 86 92 92 Z", "traps")}
      {p("M78 86 C88 70 104 74 120 78 C136 74 152 70 162 86 L170 118 C150 108 132 112 120 112 C108 112 90 108 70 118 Z", "shoulders")}
      {p("M92 112 C108 108 120 118 120 128 C120 118 132 108 148 112 L146 186 C136 196 124 198 120 190 C116 198 104 196 94 186 Z", "upper_back")}
      {p("M70 118 C84 140 94 170 100 198 L102 230 C86 220 70 180 62 148 Z", "lats")}
      {p("M170 118 C156 140 146 170 140 198 L138 230 C154 220 170 180 178 148 Z", "lats")}
      {p("M102 186 C112 184 120 190 120 198 C120 190 128 184 138 186 L140 232 C130 242 124 244 120 240 C116 244 110 242 100 232 Z", "lower_back")}
      {p("M70 118 C58 150 50 186 56 214 L76 198 C80 168 84 140 90 118 Z", "triceps")}
      {p("M170 118 C182 150 190 186 184 214 L164 198 C160 168 156 140 150 118 Z", "triceps")}
      {p("M100 230 C112 236 120 238 120 240 C120 238 128 236 140 230 L150 292 C138 304 124 308 120 304 C116 308 102 304 90 292 Z", "glutes")}
      {p("M90 292 C100 300 112 304 118 360 L100 360 C92 330 88 308 90 292 Z", "hamstrings")}
      {p("M150 292 C140 300 128 304 122 360 L140 360 C148 330 152 308 150 292 Z", "hamstrings")}
      {p("M100 360 C96 410 94 460 102 492 L118 478 C116 430 114 390 118 360 Z", "calves")}
      {p("M140 360 C144 410 146 460 138 492 L122 478 C124 430 126 390 122 360 Z", "calves")}
      <ellipse cx="56" cy="220" rx="10" ry="12" fill="var(--app-elevated)" />
      <ellipse cx="184" cy="220" rx="10" ry="12" fill="var(--app-elevated)" />
      <ellipse cx="104" cy="500" rx="14" ry="8" fill="var(--app-elevated)" />
      <ellipse cx="136" cy="500" rx="14" ry="8" fill="var(--app-elevated)" />
    </g>
  );
}
