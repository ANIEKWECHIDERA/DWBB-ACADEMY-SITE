import { Activity } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AdminPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Card className={cn("rounded-xl border-slate-200 p-4 shadow-none sm:p-5 lg:p-6", className)} {...props} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

export function ToggleField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="font-semibold text-slate-950">{label}</span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

export function MetricCard({ icon: Icon, label, value, compact = false }: { icon: typeof Activity; label: string; value: string; compact?: boolean }) {
  return (
    <AdminPanel>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <Icon className="h-5 w-5 text-brand-gold" />
      </div>
      <p className={cn("mt-5 font-bold text-slate-950", compact ? "text-2xl" : "text-4xl")}>{value}</p>
    </AdminPanel>
  );
}

export function EmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <AdminPanel className={cn("border-dashed text-center", compact ? "bg-slate-50" : "bg-white")}>
      <p className="text-lg font-semibold text-slate-950 sm:text-xl">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
    </AdminPanel>
  );
}
