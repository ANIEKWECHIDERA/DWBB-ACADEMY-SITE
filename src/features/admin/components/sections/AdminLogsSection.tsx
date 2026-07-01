import { AdminFilterCombobox } from "@/features/admin/components/AdminFilterCombobox";
import { adminRanges } from "@/features/admin/constants";
import type { AdminRange } from "@/lib/admin-api";
import type { AuditLogItem, LoginLogItem } from "@/types/admin";
import { formatDate } from "@/features/admin/utils";

import { AdminPanel, EmptyState } from "../AdminPrimitives";

export function AdminLogsSection({
  auditLogs,
  loginLogs,
  range,
  setRange,
  userFilter,
  userOptions,
  setUserFilter,
}: {
  auditLogs: AuditLogItem[];
  loginLogs: LoginLogItem[];
  range: AdminRange;
  setRange: (range: AdminRange) => void;
  userFilter: string;
  userOptions: Array<{ label: string; value: string }>;
  setUserFilter: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <AdminPanel className="p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Audit Window</p>
            <AdminFilterCombobox
              options={adminRanges.map((option) => ({ label: option.label, value: option.value }))}
              onChange={(value) => setRange(value as AdminRange)}
              placeholder="Select time range"
              searchPlaceholder="Filter ranges..."
              value={range}
            />
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">User</p>
            <AdminFilterCombobox
              options={userOptions}
              onChange={setUserFilter}
              placeholder="Select user"
              searchPlaceholder="Filter users..."
              value={userFilter}
            />
          </div>
        </div>
      </AdminPanel>

      {auditLogs.length === 0 && loginLogs.length === 0 ? (
        <EmptyState title="No audit activity yet" description="Admin session views, finance access, and sign-ins will appear here once the team starts using the console." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <AdminPanel>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Audit Logs</p>
            <div className="mt-6 space-y-3">
              {auditLogs.length === 0 ? (
                <EmptyState title="No audit logs yet" description="Action logs will appear here as admins use the console." compact />
              ) : (
                auditLogs.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                    <p className="font-semibold text-slate-950">{item.action}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.actorEmail || "System"}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                      {item.entityType} | {item.entityId} | {formatDate(item.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>

          <AdminPanel>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Login Activity</p>
            <div className="mt-6 space-y-3">
              {loginLogs.length === 0 ? (
                <EmptyState title="No login activity yet" description="Successful admin sign-ins will be listed here." compact />
              ) : (
                loginLogs.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                    <p className="font-semibold text-slate-950">{item.email}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.role.replace("_", " ")}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">{formatDate(item.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>
        </div>
      )}
    </div>
  );
}
