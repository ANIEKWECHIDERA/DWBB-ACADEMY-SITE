import type { HTMLAttributes } from "react";

import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const spinnerVariants = cva("inline-block animate-spin rounded-full border-current border-r-transparent", {
  variants: {
    size: {
      sm: "h-4 w-4 border-2",
      md: "h-5 w-5 border-2",
      lg: "h-7 w-7 border-[3px]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
}

export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  return <span aria-hidden="true" className={cn(spinnerVariants({ size }), className)} {...props} />;
}
