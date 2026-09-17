import { Drawer } from "vaul";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      {children}
    </Drawer.Root>
  );
}

export function SheetContent({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <Drawer.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-[430px] flex-col rounded-t-[28px] bg-card outline-none",
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-separator" />
        {title ? (
          <Drawer.Title className="px-5 pt-4 font-display text-[22px] font-semibold tracking-tight">
            {title}
          </Drawer.Title>
        ) : (
          <Drawer.Title className="sr-only">Sheet</Drawer.Title>
        )}
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          {children}
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  );
}
