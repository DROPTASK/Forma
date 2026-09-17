import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  caption,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  caption: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-[20px] bg-accent/12 text-accent">
        <Icon className="size-7" strokeWidth={1.75} />
      </div>
      <h3 className="font-display text-[22px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-[260px] text-[15px] text-muted">{caption}</p>
      {action && onAction ? (
        <Button className="mt-5" size="sm" onClick={onAction}>
          {action}
        </Button>
      ) : null}
    </div>
  );
}
