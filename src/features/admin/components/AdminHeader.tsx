import { Bell, Menu } from "lucide-react";

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
  onOpenNotifications,
  unreadNotifications,
}: {
  activeSection: AdminSection;
  onOpenMobileSidebar: () => void;
  onOpenNotifications: () => void;
  unreadNotifications: number;
}) {
  const pageTitle = sectionTitles[activeSection] || "Admin";

  return (
    <AdminPanel className="shrink-0 flex flex-col gap-4">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:hidden">
        <Button className="relative rounded-lg px-3 shadow-none hover:translate-y-0 md:hidden" onClick={onOpenMobileSidebar} variant="ghost">
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open navigation</span>
        </Button>

        <div className="min-w-0 text-center">
          <h2 className="text-lg font-bold text-slate-950 sm:text-xl">{pageTitle}</h2>
        </div>

        <Button className="relative h-10 w-10 rounded-lg px-0 shadow-none hover:translate-y-0 md:hidden" onClick={onOpenNotifications} variant="ghost">
          <Bell className="h-4 w-4" />
          {unreadNotifications > 0 ? (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand-coral" />
          ) : null}
          <span className="sr-only">Open notifications</span>
        </Button>
      </div>

      <div className="hidden items-start justify-between gap-4 md:flex">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">{pageTitle}</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Admin Console</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            Manage pricing as net target values, review inflows, and keep admin activity auditable.
          </p>
        </div>
        <Button className="relative h-11 w-11 rounded-lg px-0 shadow-none hover:translate-y-0" onClick={onOpenNotifications} variant="ghost">
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 ? (
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-brand-coral" />
          ) : null}
          <span className="sr-only">Open notifications</span>
        </Button>
      </div>
    </AdminPanel>
  );
}
