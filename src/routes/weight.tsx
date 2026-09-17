import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addWeight, getProfile, listWeight } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { formatKg, fromDisplayWeight, toDisplayWeight } from "@/lib/format";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/weight")({ component: WeightPage });

function WeightPage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: keys.profile, queryFn: () => getProfile() });
  const { data: entries } = useQuery({ queryKey: keys.weight, queryFn: () => listWeight() });
  const unit = profile?.unitPref ?? "kg";
  const [val, setVal] = useState("");

  const add = useMutation({
    mutationFn: () => addWeight({ data: { valueKg: fromDisplayWeight(Number(val), unit) } }),
    onSuccess: () => {
      setVal("");
      void qc.invalidateQueries({ queryKey: keys.weight });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });

  const chart = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const e of entries ?? []) byDay.set(e.date, e.valueKg);
    return [...byDay.entries()].map(([date, kg]) => ({ date, kg: toDisplayWeight(kg, unit) }));
  }, [entries, unit]);

  const latest = entries?.[entries.length - 1];
  const ma = movingAvg(chart.map((c) => c.kg), 7);

  return (
    <Screen title="Weight">
      <Card className="mb-4">
        <p className="text-[13px] text-muted">Latest</p>
        <p className="font-display text-[40px] font-bold tabular">
          {latest ? formatKg(latest.valueKg, unit) : "—"}
        </p>
        {profile?.goalWeightKg ? (
          <p className="text-[13px] text-muted">Goal {formatKg(profile.goalWeightKg, unit)}</p>
        ) : null}
      </Card>
      <Card className="mb-4 h-52">
        {chart.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart.map((c, i) => ({ ...c, ma: ma[i] }))}>
              <XAxis dataKey="date" hide />
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip />
              {profile?.goalWeightKg ? (
                <ReferenceLine y={toDisplayWeight(profile.goalWeightKg, unit)} stroke="var(--app-muted)" />
              ) : null}
              <Line type="monotone" dataKey="kg" stroke="var(--app-accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ma" stroke="var(--color-ring-ex)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="grid h-full place-items-center text-muted">Log a few days to see the trend</p>
        )}
      </Card>
      <div className="mb-3 flex gap-2">
        <Input
          inputMode="decimal"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={`Weight (${unit})`}
        />
        <Button className="shrink-0" disabled={!val || add.isPending} onClick={() => add.mutate()}>
          Log
        </Button>
      </div>
      <Link to="/scale" className="mb-4 block text-[15px] font-semibold text-accent">
        Connect a Bluetooth scale
      </Link>
      <div className="space-y-2">
        {[...(entries ?? [])].reverse().slice(0, 20).map((e) => (
          <Card key={e.id} className="flex justify-between py-3">
            <span className="text-[13px] text-muted">
              {e.date} · {e.source}
            </span>
            <span className="tabular font-semibold">{formatKg(e.valueKg, unit)}</span>
          </Card>
        ))}
      </div>
    </Screen>
  );
}

function movingAvg(values: number[], n: number) {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - n + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
