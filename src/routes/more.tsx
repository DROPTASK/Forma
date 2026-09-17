import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Flame,
  ListTodo,
  Music2,
  Settings,
  Sparkles,
} from "lucide-react";
import { Screen } from "@/components/shell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/more")({ component: More });

const rows = [
  { to: "/ai", title: "Ask AI", caption: "Log and plan with chat", icon: Sparkles, tint: "bg-tint-ai/15 text-tint-ai" },
  { to: "/schedule", title: "Timetable", caption: "Week grid and reminders", icon: CalendarDays, tint: "bg-accent/12 text-accent" },
  { to: "/challenges", title: "Challenges", caption: "Streaks and check-ins", icon: Flame, tint: "bg-warning/15 text-warning" },
  { to: "/todos", title: "To-dos", caption: "Buy stuff and reminders", icon: ListTodo, tint: "bg-tint-eat/15 text-tint-eat" },
  { to: "/journal", title: "Daily record", caption: "Mood, notes, AI recap", icon: BookOpen, tint: "bg-tint-body/15 text-tint-body" },
  { to: "/music", title: "Music", caption: "Latest hits and workout playlists", icon: Music2, tint: "bg-info/12 text-info" },
  { to: "/settings", title: "Settings", caption: "Profile, units, notifications", icon: Settings, tint: "bg-separator text-fg" },
] as const;

function More() {
  return (
    <Screen title="More">
      <Card className="p-0">
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.to}
              to={r.to}
              className={`flex items-center gap-3 px-4 py-3 ${i < rows.length - 1 ? "border-b border-separator" : ""}`}
            >
              <span className={`grid size-10 place-items-center rounded-[12px] ${r.tint}`}>
                <Icon className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold">{r.title}</p>
                <p className="text-[13px] text-muted">{r.caption}</p>
              </div>
              <ChevronRight className="size-5 text-muted" />
            </Link>
          );
        })}
      </Card>
      <p className="mt-4 flex items-center gap-2 text-[13px] text-muted">
        <Bell className="size-4" />
        Notifications are scheduled locally on this device.
      </p>
    </Screen>
  );
}
