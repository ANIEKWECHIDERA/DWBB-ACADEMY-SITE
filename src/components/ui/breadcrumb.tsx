import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export function Breadcrumb({
  items,
  light,
}: {
  items: { label: string; href?: string }[];
  light?: boolean;
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href ? (
              <Link className={light ? "text-white/70 hover:text-white" : "text-slate-500 hover:text-slate-900"} to={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className={light ? "text-white" : "text-slate-900"}>{item.label}</span>
            )}
            {index < items.length - 1 ? <ChevronRight className={light ? "h-4 w-4 text-white/50" : "h-4 w-4 text-slate-400"} /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
