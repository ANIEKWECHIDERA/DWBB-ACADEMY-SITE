import { cn } from "@/lib/utils";

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand font-display text-sm font-bold text-white",
        className,
      )}
    >
      {initials}
    </div>
  );
}
