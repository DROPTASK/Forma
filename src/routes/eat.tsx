import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AskAiButton } from "@/components/ask-ai";
import { addMeal, deleteMeal, getProfile, listMeals, searchFoods } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { todayISO } from "@/lib/utils";
import { formatKcal } from "@/lib/format";
import type { Food, MealType } from "@/lib/types";

export const Route = createFileRoute("/eat")({ component: Eat });

const types: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function Eat() {
  const date = todayISO();
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: keys.profile, queryFn: () => getProfile() });
  const { data: meals } = useQuery({ queryKey: keys.meals(date), queryFn: () => listMeals({ data: { date } }) });
  const [open, setOpen] = useState(false);
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [q, setQ] = useState("");
  const [qty, setQty] = useState("100");
  const { data: foods } = useQuery({
    queryKey: keys.foods(q),
    queryFn: () => searchFoods({ data: { q } }),
    enabled: q.length > 1,
  });

  const totals = useMemo(() => {
    const list = meals ?? [];
    return {
      cal: list.reduce((a, m) => a + m.calories, 0),
      p: list.reduce((a, m) => a + m.proteinG, 0),
      c: list.reduce((a, m) => a + m.carbsG, 0),
      f: list.reduce((a, m) => a + m.fatG, 0),
    };
  }, [meals]);

  const add = useMutation({
    mutationFn: (food: Food) => {
      const g = Number(qty) || 100;
      const factor = g / 100;
      return addMeal({
        data: {
          date,
          mealType,
          foodId: food.id,
          foodName: food.name,
          quantityG: g,
          calories: food.caloriesPer100g * factor,
          proteinG: food.proteinG * factor,
          carbsG: food.carbsG * factor,
          fatG: food.fatG * factor,
        },
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.meals(date) });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMeal({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.meals(date) });
      void qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });

  const goal = profile?.calorieGoal ?? 2200;

  return (
    <Screen
      title="Eat"
      trailing={
        <AskAiButton
          toolNames={["addMeal"]}
          context={`Today ${Math.round(totals.cal)} kcal. Goal ${goal}.`}
        />
      }
    >
      <Card className="mb-4">
        <p className="font-display text-[34px] font-bold tabular">{formatKcal(totals.cal)}</p>
        <p className="text-[13px] text-muted">of {goal} kcal</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-separator">
          <div
            className="h-full rounded-full bg-ring-move"
            style={{ width: `${Math.min(100, (totals.cal / goal) * 100)}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[13px]">
          <Macro label="Protein" value={totals.p} goal={profile?.proteinGoal ?? 160} />
          <Macro label="Carbs" value={totals.c} goal={profile?.carbsGoal ?? 220} />
          <Macro label="Fat" value={totals.f} goal={profile?.fatGoal ?? 70} />
        </div>
      </Card>

      <div className="mb-4 flex gap-2">
        <Button className="flex-1" onClick={() => setOpen(true)}>
          Add food
        </Button>
        <Button variant="secondary" className="flex-1" asChild>
          <Link to="/diet">Diet plan</Link>
        </Button>
      </div>

      {types.map((t) => {
        const items = (meals ?? []).filter((m) => m.mealType === t);
        return (
          <div key={t} className="mb-4">
            <h2 className="mb-2 capitalize text-[13px] font-semibold text-muted">{t}</h2>
            {items.length === 0 ? (
              <p className="text-[15px] text-muted">Nothing logged</p>
            ) : (
              <div className="space-y-2">
                {items.map((m) => (
                  <Card key={m.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">
                        {m.foodName}
                        {m.aiParsed ? (
                          <span className="ml-2 text-[11px] font-semibold uppercase text-info">AI</span>
                        ) : null}
                      </p>
                      <p className="text-[13px] text-muted">
                        {Math.round(m.quantityG)} g · {Math.round(m.calories)} kcal
                      </p>
                    </div>
                    <button type="button" className="text-[13px] text-danger" onClick={() => remove.mutate(m.id)}>
                      Remove
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title="Add food">
          <div className="mb-3 flex gap-1 overflow-x-auto">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMealType(t)}
                className={`h-8 rounded-full px-3 text-[13px] font-semibold capitalize ${
                  mealType === t ? "bg-accent text-accent-fg" : "bg-bg text-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search foods" />
          <div className="mt-3">
            <p className="mb-1 text-[13px] text-muted">Portion (g)</p>
            <Input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="mt-3 space-y-2">
            {(foods ?? []).map((f) => (
              <button
                key={f.id}
                type="button"
                className="pressable w-full rounded-[14px] bg-bg px-3 py-3 text-left"
                onClick={() => add.mutate(f)}
              >
                <p className="font-semibold">{f.name}</p>
                <p className="text-[13px] text-muted">
                  {Math.round(f.caloriesPer100g)} kcal / 100g · P{f.proteinG} C{f.carbsG} F{f.fatG}
                </p>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}

function Macro({ label, value, goal }: { label: string; value: number; goal: number }) {
  return (
    <div>
      <p className="tabular font-semibold">{Math.round(value)}g</p>
      <p className="text-muted">{label}</p>
      <p className="text-[11px] text-muted">{goal}g goal</p>
    </div>
  );
}
