import { format, parseISO, isToday, isYesterday } from "date-fns";

export function formatKg(kg: number, unit: "kg" | "lb" = "kg"): string {
  if (unit === "lb") return `${(kg * 2.20462).toFixed(1)} lb`;
  return `${kg.toFixed(1)} kg`;
}

export function toDisplayWeight(kg: number, unit: "kg" | "lb"): number {
  return unit === "lb" ? kg * 2.20462 : kg;
}

export function fromDisplayWeight(value: number, unit: "kg" | "lb"): number {
  return unit === "lb" ? value / 2.20462 : value;
}

export function formatKcal(n: number): string {
  return `${Math.round(n).toLocaleString()} kcal`;
}

export function formatDateLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, d MMM");
}

export function formatClock(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return format(d, "h:mm a");
}

export function epley1rm(weight: number, reps: number): number {
  if (!reps || reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

export function weekdayShort(i: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i] ?? "";
}
