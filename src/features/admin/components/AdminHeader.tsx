import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AdminSection } from "@/features/admin/types";

import { AdminPanel } from "./AdminPrimitives";

export function AdminHeader({
  activeSection,
  onOpenMobileSidebar,
}: {
  activeSection: AdminSection;
  onOpenMobileSidebar: () => void;
}) {
  return (
    <AdminPanel className="shrink-0 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">{activeSection}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Precision control for DWBB operations</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:leading-7">
            Manage pricing as net target values, review inflows, and keep admin activity auditable.
          </p>
        </div>

        <Button className="rounded-lg px-3 shadow-none hover:translate-y-0 md:hidden" onClick={onOpenMobileSidebar} variant="ghost">
          <Menu className="h-4 w-4" />
          Menu
        </Button>
      </div>
    </AdminPanel>
  );
}
