import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export interface AccordionItemData {
  value: string;
  trigger: string;
  content: React.ReactNode;
}

export function Accordion({ items }: { items: AccordionItemData[] }) {
  const [open, setOpen] = useState(items[0]?.value ?? "");

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const expanded = open === item.value;
        return (
          <div key={item.value} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              onClick={() => setOpen(expanded ? "" : item.value)}
            >
              <span className="font-display text-lg font-semibold text-slate-950">{item.trigger}</span>
              <ChevronDown className={cn("h-5 w-5 text-slate-500 transition", expanded && "rotate-180")} />
            </button>
            {expanded ? <div className="px-6 pb-6 text-sm leading-7 text-slate-600">{item.content}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
