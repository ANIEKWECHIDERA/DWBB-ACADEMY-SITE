import { cn } from "@/lib/utils";

export function Avatar({
  initials,
  src,
  alt,
  className,
}: {
  initials: string;
  src?: string;
  alt?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-brand font-display text-sm font-bold text-white",
        className,
      )}
    >
      {src ? (
        <img
          alt={alt ?? "Profile photo"}
          className="h-full w-full object-cover"
          loading="lazy"
          src={src}
        />
      ) : (
        initials
      )}
    </div>
  );
}
