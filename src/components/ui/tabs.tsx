import { cn } from "@/lib/utils";

export function Tabs({
  value,
  onChange,
  items,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  items: string[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {items.map((item) => {
        const active = item === value;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              active
                ? "bg-deep-blue text-white shadow-soft"
                : "border border-slate-200 bg-white text-slate-600 hover:border-brand-sky hover:text-slate-900",
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
