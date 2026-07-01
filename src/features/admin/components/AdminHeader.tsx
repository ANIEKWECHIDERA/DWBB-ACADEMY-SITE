import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { AdminRange } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import type { AdminNavSection, AdminSection } from "@/features/admin/types";

import { AdminPanel } from "./AdminPrimitives";

export function AdminHeader({
  activeSection,
  mobileSections,
  onLogout,
  onSelectSection,
  onSelectRange,
  range,
  ranges,
  shouldShowRangeFilter,
}: {
  activeSection: AdminSection;
  mobileSections: AdminNavSection[];
  onLogout: () => Promise<void>;
  onSelectSection: (section: AdminSection) => void;
  onSelectRange: (range: AdminRange) => void;
  range: AdminRange;
  ranges: Array<{ label: string; value: AdminRange }>;
  shouldShowRangeFilter: boolean;
}) {
  return (
    <AdminPanel className="shrink-0 flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">{activeSection}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Precision control for DWBB operations</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:leading-7">
            Manage pricing as net target values, review inflows, and keep admin activity auditable.
          </p>
        </div>

        <Button className="hidden rounded-lg shadow-none hover:translate-y-0 md:hidden" onClick={onLogout} variant="ghost">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="grid gap-3 md:hidden">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Select className="rounded-lg" onChange={(event) => onSelectSection(event.target.value as AdminSection)} value={activeSection}>
            {mobileSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </Select>
          <Button className="rounded-lg shadow-none hover:translate-y-0 sm:min-w-28" onClick={onLogout} variant="outline">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {mobileSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                  activeSection === section.id ? "bg-deep-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {shouldShowRangeFilter ? (
        <div className="flex flex-wrap gap-2">
          {ranges.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelectRange(option.value)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4",
                range === option.value ? "bg-deep-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </AdminPanel>
  );
}
