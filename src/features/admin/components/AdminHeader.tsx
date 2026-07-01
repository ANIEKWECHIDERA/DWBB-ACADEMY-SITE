import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AdminSection } from "@/features/admin/types";

import { AdminPanel } from "./AdminPrimitives";

const sectionTitles: Record<AdminSection, string> = {
  overview: "Overview",
  courses: "Courses",
  notifications: "Notifications",
  transactions: "Transactions",
  customers: "Customers",
  logs: "Audit Logs",
  admins: "Admins",
};

export function AdminHeader({
  activeSection,
  onOpenMobileSidebar,
}: {
  activeSection: AdminSection;
  onOpenMobileSidebar: () => void;
}) {
  const pageTitle = sectionTitles[activeSection] || "Admin";

  return (
    <AdminPanel className="shrink-0 flex flex-col gap-4">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:hidden">
        <Button className="rounded-lg px-3 shadow-none hover:translate-y-0 md:hidden" onClick={onOpenMobileSidebar} variant="ghost">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open navigation</span>
        </Button>

        <div className="min-w-0 text-center">
          <h2 className="text-lg font-bold text-slate-950 sm:text-xl">{pageTitle}</h2>
        </div>

        <div className="h-10 w-10 md:hidden" />
      </div>

      <div className="hidden md:block">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">{pageTitle}</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">Admin Console</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
          Manage pricing as net target values, review inflows, and keep admin activity auditable.
        </p>
      </div>
    </AdminPanel>
  );
}
