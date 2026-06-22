import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  imageClassName,
  withWordmark = true,
  light = false,
}: {
  className?: string;
  imageClassName?: string;
  withWordmark?: boolean;
  light?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/dwbb-logo.png"
        alt="DWBB Academy logo"
        className={cn("h-14 w-auto object-contain", imageClassName)}
      />
      {withWordmark ? (
        <div>
          <p className={cn("font-display text-lg font-bold leading-none", light ? "text-white" : "text-slate-950")}>
            DWBB Academy
          </p>
          <p className={cn("mt-1 text-xs uppercase tracking-[0.24em]", light ? "text-white/65" : "text-slate-500")}>
            Digital career launchpad
          </p>
        </div>
      ) : null}
    </div>
  );
}
