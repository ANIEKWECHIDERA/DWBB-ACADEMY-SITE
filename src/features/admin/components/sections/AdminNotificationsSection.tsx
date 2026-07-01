import { CheckCheck, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AdminNotification, AdminSession } from "@/types/admin";
import { formatCurrencyFromKobo, formatRelativeTime } from "@/features/admin/utils";

import { AdminPanel, EmptyState } from "../AdminPrimitives";

export function AdminNotificationsSection({
  notifications,
  onDismissNotification,
  onMarkAllNotificationsRead,
  onNotificationStatus,
  session,
  setActiveSection,
  unreadNotifications,
}: {
  notifications: AdminNotification[];
  onDismissNotification: (notificationId: string) => Promise<void>;
  onMarkAllNotificationsRead: () => Promise<void>;
  onNotificationStatus: (notificationId: string, status: "read" | "unread") => Promise<void>;
  session: AdminSession;
  setActiveSection: () => void;
  unreadNotifications: number;
}) {
  return (
    <div className="space-y-6">
      <AdminPanel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Notifications</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">Purchase activity and alerts</h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Every verified course purchase creates a notification here so the team can follow up quickly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {unreadNotifications} unread
            </span>
            <Button className="rounded-xl shadow-none hover:translate-y-0" disabled={unreadNotifications === 0} onClick={onMarkAllNotificationsRead} variant="ghost">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          </div>
        </div>
      </AdminPanel>

      {notifications.length === 0 ? (
        <EmptyState title="No notifications yet" description="New purchase alerts will appear here automatically after verified Paystack payments." />
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <AdminPanel
              key={notification.id}
              className={cn(!notification.readAt && "border-brand-gold/50 bg-brand-gold/5")}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{notification.title}</p>
                    {!notification.readAt ? (
                      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{notification.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{notification.courseTitle || "Purchase"}</span>
                    <span>{notification.customerEmail || "-"}</span>
                    <span>{notification.amountKobo ? formatCurrencyFromKobo(notification.amountKobo) : "-"}</span>
                    <span>{formatRelativeTime(notification.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {notification.transactionReference && session.permissions.canViewTransactions ? (
                    <Button className="rounded-xl px-3 shadow-none hover:translate-y-0" onClick={setActiveSection} variant="ghost">
                      View transaction
                    </Button>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open notification actions</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Notification</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onNotificationStatus(notification.id, notification.readAt ? "unread" : "read")}>
                        Mark as {notification.readAt ? "unread" : "read"}
                      </DropdownMenuItem>
                      {notification.transactionReference && session.permissions.canViewTransactions ? (
                        <DropdownMenuItem onClick={setActiveSection}>Open transactions</DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDismissNotification(notification.id)}>Dismiss</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </AdminPanel>
          ))}
        </div>
      )}
    </div>
  );
}
