import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { AskAiButton } from "@/components/ask-ai";
import { addMeal, getProfile, listDietPlans } from "@/lib/server/fitness";
import { askAi, executeAiActions } from "@/lib/server/ai";
import { keys } from "@/lib/query";
import { todayISO } from "@/lib/utils";
import { toast } from "sonner";
import type { MealType } from "@/lib/types";

export const Route = createFileRoute("/diet")({ component: Diet });

function Diet() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: keys.profile, queryFn: () => getProfile() });
  const { data: plans } = useQuery({ queryKey: keys.diet, queryFn: () => listDietPlans() });
  const [goal, setGoal] = useState(profile?.goalType ?? "cut");
  const [cals, setCals] = useState(String(profile?.calorieGoal ?? 2200));
  const [diet, setDiet] = useState("omnivore");
  const [restrict, setRestrict] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const res = await askAi({
        data: {
          message: `Generate a 3-day diet plan. Goal ${goal}, ${cals} kcal/day, ${diet}. Restrictions: ${restrict || "none"}. Use generateDietPlan.`,
          toolNames: ["generateDietPlan"],
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.actions.length) {
        await executeAiActions({ data: { actions: res.actions } });
        toast.success("Plan saved");
        void qc.invalidateQueries({ queryKey: keys.diet });
      } else {
        toast.message(res.text);
      }
    } finally {
      setBusy(false);
    }
  }

  const apply = useMutation({
    mutationFn: async (planId: string) => {
      const plan = plans?.find((p) => p.id === planId);
      const day = plan?.plan.days[0];
      if (!day) return;
      for (const meal of day.meals) {
        for (const item of meal.items) {
          await addMeal({
            data: {
              date: todayISO(),
              mealType: meal.mealType as MealType,
              foodName: item.name,
              quantityG: 100,
              calories: item.calories,
              proteinG: item.protein,
              carbsG: item.carbs,
              fatG: item.fat,
              aiParsed: true,
            },
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Applied to today");
      void qc.invalidateQueries();
    },
  });

  return (
    <Screen title="Diet" trailing={<AskAiButton toolNames={["generateDietPlan"]} />}>
      <Card className="mb-4 space-y-3">
        <div className="flex gap-2">
          {(["cut", "bulk", "maintain"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal(g)}
              className={`h-9 flex-1 rounded-full text-[13px] font-semibold capitalize ${
                goal === g ? "bg-accent text-accent-fg" : "bg-bg text-muted"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <Input value={cals} onChange={(e) => setCals(e.target.value)} inputMode="numeric" />
        <Input value={diet} onChange={(e) => setDiet(e.target.value)} placeholder="Diet type" />
        <Textarea value={restrict} onChange={(e) => setRestrict(e.target.value)} placeholder="Allergies or exclusions" />
        <Button className="w-full" disabled={busy} onClick={() => void generate()}>
          {busy ? "Generating…" : "Generate plan"}
        </Button>
      </Card>

      <div className="space-y-3">
        {(plans ?? []).map((p) => (
          <Card key={p.id}>
            <p className="font-display text-[22px] font-semibold">{p.title}</p>
            <p className="text-[13px] text-muted">
              {p.calorieTarget ?? "—"} kcal · {p.dietType}
            </p>
            <div className="mt-3 space-y-3">
              {p.plan.days.slice(0, 3).map((d) => (
                <div key={d.day}>
                  <p className="text-[13px] font-semibold">
                    {d.day} · {Math.round(d.calories)} kcal
                  </p>
                  {d.meals.map((m) => (
                    <p key={m.mealType} className="text-[13px] text-muted">
                      <span className="capitalize">{m.mealType}:</span> {m.items.map((i) => i.name).join(", ")}
                    </p>
                  ))}
                </div>
              ))}
            </div>
            <Button size="sm" className="mt-3" variant="secondary" onClick={() => apply.mutate(p.id)}>
              Apply day 1 to today
            </Button>
          </Card>
        ))}
      </div>
    </Screen>
  );
}
