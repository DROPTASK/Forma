import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ChevronRight, Scale, Spline } from "lucide-react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/body")({ component: BodyHub });

function BodyHub() {
  const items = [
    { to: "/weight", title: "Weight", caption: "Trend, goal, BLE scale", icon: Scale },
    { to: "/measure", title: "Camera measure", caption: "Pose estimate from a photo", icon: Camera },
    { to: "/map", title: "Muscle map", caption: "Front and back volume this week", icon: Spline },
    { to: "/scale", title: "Connect scale", caption: "openScale broadcast + BLE", icon: Scale },
  ] as const;
  return (
    <Screen title="Body">
      <div className="space-y-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to} className="block">
              <Card className="pressable flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-[12px] bg-tint-body/15 text-tint-body">
                  <Icon className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{it.title}</p>
                  <p className="text-[13px] text-muted">{it.caption}</p>
                </div>
                <ChevronRight className="size-5 text-muted" />
              </Card>
            </Link>
          );
        })}
      </div>
    </Screen>
  );
}
