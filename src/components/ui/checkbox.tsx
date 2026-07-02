import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-[4px] border border-slate-300 bg-white text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 data-[state=checked]:border-slate-950 data-[state=checked]:bg-slate-950 data-[state=indeterminate]:border-slate-950 data-[state=indeterminate]:bg-slate-950",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="h-3.5 w-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
