export function ActivityRings({
  calories,
  calorieGoal,
  exerciseMin,
  exerciseGoal,
  streak,
  streakGoal,
}: {
  calories: number;
  calorieGoal: number;
  exerciseMin: number;
  exerciseGoal: number;
  streak: number;
  streakGoal: number;
}) {
  const size = 188;
  const stroke = 16;
  const gap = 8;
  const c1 = size / 2;
  const r1 = 78;
  const r2 = r1 - stroke - gap;
  const r3 = r2 - stroke - gap;

  const ring = (r: number, value: number, goal: number, color: string) => {
    const circ = 2 * Math.PI * r;
    const pct = Math.min(1, goal > 0 ? value / goal : 0);
    return (
      <circle
        cx={c1}
        cy={c1}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ}`}
        transform={`rotate(-90 ${c1} ${c1})`}
      />
    );
  };

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={c1} cy={c1} r={r1} fill="none" stroke="var(--app-separator)" strokeWidth={stroke} />
        <circle cx={c1} cy={c1} r={r2} fill="none" stroke="var(--app-separator)" strokeWidth={stroke} />
        <circle cx={c1} cy={c1} r={r3} fill="none" stroke="var(--app-separator)" strokeWidth={stroke} />
        {ring(r1, calories, calorieGoal, "var(--color-ring-move)")}
        {ring(r2, exerciseMin, exerciseGoal, "var(--color-ring-ex)")}
        {ring(r3, streak, streakGoal, "var(--color-ring-stand)")}
      </svg>
      <div className="space-y-3 text-[13px] font-medium">
        <div>
          <p className="text-ring-move tabular text-[22px] font-semibold leading-none">
            {Math.round(calories)}
            <span className="text-[13px] font-medium text-muted"> / {calorieGoal}</span>
          </p>
          <p className="mt-0.5 text-muted">Calories</p>
        </div>
        <div>
          <p className="text-ring-ex tabular text-[22px] font-semibold leading-none">
            {exerciseMin}
            <span className="text-[13px] font-medium text-muted"> / {exerciseGoal} min</span>
          </p>
          <p className="mt-0.5 text-muted">Exercise</p>
        </div>
        <div>
          <p className="text-ring-stand tabular text-[22px] font-semibold leading-none">
            {streak}
            <span className="text-[13px] font-medium text-muted"> day streak</span>
          </p>
          <p className="mt-0.5 text-muted">Consistency</p>
        </div>
      </div>
    </div>
  );
}
