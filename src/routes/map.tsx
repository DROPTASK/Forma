import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";
import { MuscleMapView } from "@/components/muscle-map";
import { getMuscleVolume, listExercises } from "@/lib/server/fitness";
import { keys } from "@/lib/query";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export const Route = createFileRoute("/map")({ component: MapPage });

function MapPage() {
  const { data: volume } = useQuery({ queryKey: keys.muscle, queryFn: () => getMuscleVolume() });
  const { data: exercises } = useQuery({ queryKey: keys.exercises, queryFn: () => listExercises() });
  const [muscle, setMuscle] = useState<string | null>(null);
  const matches = (exercises ?? []).filter((e) => muscle && e.muscleGroups.includes(muscle));

  return (
    <Screen title="Map">
      <Card>
        <MuscleMapView volume={volume ?? {}} onSelect={setMuscle} />
      </Card>
      <Sheet open={!!muscle} onOpenChange={(v) => !v && setMuscle(null)}>
        <SheetContent title={muscle ? muscle.replaceAll("_", " ") : "Muscle"}>
          <p className="mb-3 text-[13px] text-muted">
            Volume this week: {Math.round(volume?.[muscle ?? ""] ?? 0)} kg
          </p>
          <div className="space-y-2">
            {matches.map((e) => (
              <Link key={e.id} to="/exercise/$id" params={{ id: e.id }} className="block rounded-[14px] bg-bg px-3 py-3">
                <p className="font-semibold">{e.name}</p>
                <p className="text-[13px] capitalize text-muted">{e.equipment}</p>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
