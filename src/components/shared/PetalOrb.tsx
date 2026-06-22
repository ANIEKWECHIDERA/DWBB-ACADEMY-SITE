import { cn } from "@/lib/utils";

export function PetalOrb({
  size = 400,
  opacity = 0.3,
  blur = 60,
  className,
}: {
  size?: number;
  opacity?: number;
  blur?: number;
  className?: string;
}) {
  return (
    <div className={cn("pointer-events-none absolute", className)} style={{ filter: `blur(${blur}px)`, opacity }}>
      <svg width={size} height={size} viewBox="0 0 320 320" fill="none" aria-hidden="true">
        <path d="M132 56C98 64 72 102 76 142C80 188 122 216 164 216C162 188 170 150 196 114C178 84 156 62 132 56Z" fill="#F4725A" />
        <path d="M162 40C126 60 110 108 120 152C130 196 170 232 212 244C230 200 232 146 212 102C202 80 186 56 162 40Z" fill="#76C3E8" />
        <path d="M214 70C184 82 164 110 160 148C156 188 178 228 214 252C248 232 270 198 270 160C270 120 250 90 214 70Z" fill="#4CC9A0" />
      </svg>
    </div>
  );
}
