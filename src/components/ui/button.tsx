import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "gold";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  default: "bg-deep-blue text-white hover:bg-mid-blue",
  outline: "border border-white/30 bg-white/5 text-white hover:bg-white/10",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  gold: "bg-gradient-cta text-slate-950 shadow-soft hover:opacity-95",
};

export function Button({ asChild, className, variant = "default", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
