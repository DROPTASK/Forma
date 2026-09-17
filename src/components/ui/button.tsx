import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "pressable inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:brightness-110",
        secondary:
          "bg-accent/12 text-accent hover:bg-accent/18",
        ghost: "bg-transparent text-fg hover:bg-separator/60",
        danger: "bg-danger text-white hover:brightness-110",
        elevated: "bg-elevated text-fg hover:bg-separator/50",
      },
      size: {
        md: "h-12 rounded-[14px] px-5 text-[17px]",
        sm: "h-9 rounded-[12px] px-3.5 text-[15px]",
        pill: "h-8 rounded-full px-3 text-[13px]",
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
