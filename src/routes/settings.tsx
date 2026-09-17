import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserButton } from "@/lib/auth/gates";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme";
import { getProfile, saveProfile } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { toast } from "sonner";
import type { ThemePref, UnitPref } from "@/lib/types";
import { useState } from "react";

export const Route = createFileRoute("/settings")({ component: Settings });

function Settings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: keys.profile, queryFn: () => getProfile() });
  const { pref, setPref } = useTheme();
  const [height, setHeight] = useState<string | null>(null);
  const [goalW, setGoalW] = useState<string | null>(null);
  const [cals, setCals] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      saveProfile({
        data: {
          heightCm: height != null ? Number(height) : data?.heightCm,
          goalWeightKg: goalW != null ? Number(goalW) : data?.goalWeightKg,
          calorieGoal: cals != null ? Number(cals) : data?.calorieGoal,
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      void qc.invalidateQueries({ queryKey: keys.profile });
    },
  });

  const unitMut = useMutation({
    mutationFn: (unitPref: UnitPref) => saveProfile({ data: { unitPref } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile }),
  });

  async function enableNotes() {
    if (!("Notification" in window)) {
      toast.error("Notifications are not available here");
      return;
    }
    const perm = await Notification.requestPermission();
    toast.message(perm === "granted" ? "Notifications on" : "Permission denied");
  }

  return (
    <Screen title="Settings">
      <Card className="mb-4">
        <UserButton />
      </Card>
      <Card className="mb-4 space-y-3">
        <p className="text-[13px] font-semibold text-muted">Appearance</p>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as ThemePref[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setPref(t);
                void saveProfile({ data: { themePref: t } });
              }}
              className={`h-9 flex-1 rounded-full text-[13px] font-semibold capitalize ${
                pref === t ? "bg-accent text-accent-fg" : "bg-bg text-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Card>
      <Card className="mb-4 space-y-3">
        <p className="text-[13px] font-semibold text-muted">Units</p>
        <div className="flex gap-2">
          {(["kg", "lb"] as UnitPref[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => unitMut.mutate(u)}
              className={`h-9 flex-1 rounded-full text-[13px] font-semibold ${
                data?.unitPref === u ? "bg-accent text-accent-fg" : "bg-bg text-muted"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </Card>
      <Card className="mb-4 space-y-3">
        <p className="text-[13px] font-semibold text-muted">Body & goals</p>
        <Input
          inputMode="decimal"
          value={height ?? String(data?.heightCm ?? "")}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="Height (cm)"
        />
        <Input
          inputMode="decimal"
          value={goalW ?? String(data?.goalWeightKg ?? "")}
          onChange={(e) => setGoalW(e.target.value)}
          placeholder="Goal weight (kg)"
        />
        <Input
          inputMode="numeric"
          value={cals ?? String(data?.calorieGoal ?? "")}
          onChange={(e) => setCals(e.target.value)}
          placeholder="Calorie goal"
        />
        <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
          Save profile
        </Button>
      </Card>
      <Card className="mb-4 space-y-3">
        <p className="text-[13px] font-semibold text-muted">Notifications</p>
        <p className="text-[15px] text-muted">
          Local reminders for to-dos, meals, workouts, and streak-at-risk. Quiet hours can be set after
          permission is granted.
        </p>
        <Button variant="secondary" className="w-full" onClick={() => void enableNotes()}>
          Allow notifications
        </Button>
      </Card>
      <Card className="mb-4 space-y-3">
        <p className="text-[13px] font-semibold text-muted">Android APK</p>
        <p className="text-[15px] leading-relaxed text-muted">
          A GitHub Action converts this app into a sideloadable APK. After you publish, open
          Actions → “Convert PWA to Android APK”, paste the live HTTPS URL, and download
          <span className="font-semibold text-fg"> forma.apk</span> from the run artifacts.
        </p>
        <p className="text-[13px] leading-relaxed text-muted">
          Install on your phone (allow unknown sources). The APK opens Forma in Chrome as a
          Trusted Web Activity, which is what lets the broadcast scale and music keep working.
        </p>
      </Card>
      <p className="text-[12px] leading-relaxed text-muted">
        Body photos stay on this device. Nutrition and measurements are estimates, not medical
        advice. Add Forma to your Android home screen from the browser menu for an app-like install.
      </p>
    </Screen>
  );
}
