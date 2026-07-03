import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  heading,
  subtext,
  centered = true,
  light,
}: {
  eyebrow?: string;
  heading: string;
  subtext?: string;
  centered?: boolean;
  light?: boolean;
}) {
  return (
    <div className={cn("max-w-3xl", centered && "mx-auto text-center")}>
      {eyebrow ? (
        <p className={cn("text-sm font-semibold uppercase tracking-[0.24em]", light ? "text-brand-gold" : "text-brand-gold")}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className={cn("mt-3 text-2xl font-bold leading-tight sm:text-4xl", light ? "text-white" : "text-slate-950")}>
        {heading}
      </h2>
      {subtext ? (
        <p className={cn("mt-4 text-sm leading-7 sm:text-lg", light ? "text-white/75" : "text-slate-600")}>{subtext}</p>
      ) : null}
    </div>
  );
}
