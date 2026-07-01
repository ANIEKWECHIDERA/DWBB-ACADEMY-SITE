import { useMemo, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import { AdminFilterCombobox } from "@/features/admin/components/AdminFilterCombobox";
import { adminRanges } from "@/features/admin/constants";
import type { AdminRange } from "@/lib/admin-api";
import type { AuditLogItem, LoginLogItem } from "@/types/admin";
import { formatDate } from "@/features/admin/utils";

import { AdminPanel, EmptyState } from "../AdminPrimitives";

type AuditView = "audit" | "login";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-slate-200 py-3 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}

export function AdminLogsSection({
  auditLogs,
  loginLogs,
  onSyncAuditLogs,
  pendingAuditLogCount,
  range,
  setRange,
  userFilter,
  userOptions,
  setUserFilter,
}: {
  auditLogs: AuditLogItem[];
  loginLogs: LoginLogItem[];
  onSyncAuditLogs: () => Promise<void>;
  pendingAuditLogCount: number;
  range: AdminRange;
  setRange: (range: AdminRange) => void;
  userFilter: string;
  userOptions: Array<{ label: string; value: string }>;
  setUserFilter: (value: string) => void;
}) {
  const [desktopView, setDesktopView] = useState<AuditView>("audit");
  const [selectedAuditId, setSelectedAuditId] = useState<string>(auditLogs[0]?.id || "");
  const [selectedLoginId, setSelectedLoginId] = useState<string>(loginLogs[0]?.id || "");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileSelection, setMobileSelection] = useState<{ type: AuditView; id: string } | null>(null);

  const selectedAudit = useMemo(() => auditLogs.find((item) => item.id === selectedAuditId) || auditLogs[0] || null, [auditLogs, selectedAuditId]);
  const selectedLogin = useMemo(() => loginLogs.find((item) => item.id === selectedLoginId) || loginLogs[0] || null, [loginLogs, selectedLoginId]);
  const activeMobileLog = mobileSelection?.type === "login"
    ? loginLogs.find((item) => item.id === mobileSelection.id) || null
    : auditLogs.find((item) => item.id === mobileSelection?.id) || null;

  const auditMetadataRows = selectedAudit?.metadata
    ? Object.entries(selectedAudit.metadata).map(([key, value]) => ({
        label: key,
        value: typeof value === "string" ? value : JSON.stringify(value),
      }))
    : [];

  function openMobileLog(type: AuditView, id: string) {
    setMobileSelection({ type, id });
    setMobileSheetOpen(true);
  }

  return (
    <div className="space-y-6">
      <AdminPanel className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {pendingAuditLogCount} pending sync
              </span>
            </div>
            <Button className="rounded-lg shadow-none hover:translate-y-0" disabled={pendingAuditLogCount === 0} onClick={onSyncAuditLogs} variant="ghost">
              <Upload className="h-4 w-4" />
              Sync Audit Logs
            </Button>
          </div>

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
        </div>
      </AdminPanel>

      {auditLogs.length === 0 && loginLogs.length === 0 ? (
        <EmptyState title="No audit activity yet" description="Admin session views, finance access, and sign-ins will appear here once the team starts using the console." />
      ) : (
        <>
          <div className="space-y-4 lg:hidden">
            <AdminPanel>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Audit Logs</p>
              <div className="mt-4 space-y-3">
                {auditLogs.length === 0 ? (
                  <EmptyState title="No audit logs yet" description="Action logs will appear here as admins use the console." compact />
                ) : (
                  auditLogs.map((item) => (
                    <button key={item.id} className="w-full rounded-lg border border-slate-200 p-4 text-left" onClick={() => openMobileLog("audit", item.id)} type="button">
                      <p className="font-semibold text-slate-950">{item.action}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.actorEmail || "System"}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                        {item.entityType} | {item.entityId} | {formatDate(item.createdAt)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </AdminPanel>

            <AdminPanel>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Login Activity</p>
              <div className="mt-4 space-y-3">
                {loginLogs.length === 0 ? (
                  <EmptyState title="No login activity yet" description="Successful admin sign-ins will be listed here." compact />
                ) : (
                  loginLogs.map((item) => (
                    <button key={item.id} className="w-full rounded-lg border border-slate-200 p-4 text-left" onClick={() => openMobileLog("login", item.id)} type="button">
                      <p className="font-semibold text-slate-950">{item.email}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.role.replace("_", " ")}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">{formatDate(item.createdAt)}</p>
                    </button>
                  ))
                )}
              </div>
            </AdminPanel>
          </div>

          <div className="hidden gap-6 lg:grid lg:grid-cols-[0.95fr_1.15fr]">
            <AdminPanel>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Audit Workspace</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">Review activity and compliance details</h3>
                </div>
              </div>
              <Tabs
                className="mt-6"
                items={["Audit Logs", "Login Activity"]}
                onChange={(value) => setDesktopView(value === "Login Activity" ? "login" : "audit")}
                value={desktopView === "login" ? "Login Activity" : "Audit Logs"}
              />

              <div className="mt-6 space-y-3">
                {desktopView === "audit" ? (
                  auditLogs.length === 0 ? (
                    <EmptyState title="No audit logs yet" description="Action logs will appear here as admins use the console." compact />
                  ) : (
                    auditLogs.map((item) => (
                      <button
                        key={item.id}
                        className={`w-full rounded-lg border p-4 text-left ${selectedAudit?.id === item.id ? "border-brand-gold bg-brand-gold/10" : "border-slate-200"}`}
                        onClick={() => setSelectedAuditId(item.id)}
                        type="button"
                      >
                        <p className="font-semibold text-slate-950">{item.action}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.actorEmail || "System"}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                          {item.entityType} | {item.entityId} | {formatDate(item.createdAt)}
                        </p>
                      </button>
                    ))
                  )
                ) : loginLogs.length === 0 ? (
                  <EmptyState title="No login activity yet" description="Successful admin sign-ins will be listed here." compact />
                ) : (
                  loginLogs.map((item) => (
                    <button
                      key={item.id}
                      className={`w-full rounded-lg border p-4 text-left ${selectedLogin?.id === item.id ? "border-brand-gold bg-brand-gold/10" : "border-slate-200"}`}
                      onClick={() => setSelectedLoginId(item.id)}
                      type="button"
                    >
                      <p className="font-semibold text-slate-950">{item.email}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.role.replace("_", " ")}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">{formatDate(item.createdAt)}</p>
                    </button>
                  ))
                )}
              </div>
            </AdminPanel>

            <AdminPanel>
              {desktopView === "audit" ? (
                selectedAudit ? (
                  <>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Preview</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-950">{selectedAudit.action}</h3>
                    <div className="mt-6">
                      <DetailRow label="Actor" value={selectedAudit.actorEmail || "System"} />
                      <DetailRow label="Role" value={selectedAudit.actorRole || "Unknown"} />
                      <DetailRow label="Entity Type" value={selectedAudit.entityType} />
                      <DetailRow label="Entity ID" value={selectedAudit.entityId} />
                      <DetailRow label="Timestamp" value={formatDate(selectedAudit.createdAt)} />
                      {auditMetadataRows.length > 0 ? auditMetadataRows.map((row) => <DetailRow key={row.label} label={row.label} value={row.value} />) : <DetailRow label="Metadata" value="No additional metadata captured." />}
                    </div>
                  </>
                ) : (
                  <EmptyState title="Select an audit event" description="Choose an audit log entry to inspect more details." compact />
                )
              ) : selectedLogin ? (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Preview</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">{selectedLogin.email}</h3>
                  <div className="mt-6">
                    <DetailRow label="Role" value={selectedLogin.role.replace("_", " ")} />
                    <DetailRow label="UID" value={selectedLogin.uid} />
                    <DetailRow label="Time" value={formatDate(selectedLogin.createdAt)} />
                    <DetailRow label="Device" value="Not captured yet" />
                    <DetailRow label="Session Duration" value="Not captured yet" />
                    <DetailRow label="Compliance Notes" value="Only authentication event data is currently stored for login records." />
                  </div>
                </>
              ) : (
                <EmptyState title="Select a login event" description="Choose a login activity entry to inspect more details." compact />
              )}
            </AdminPanel>
          </div>

          <Sheet onOpenChange={setMobileSheetOpen} open={mobileSheetOpen}>
            <SheetContent>
              {activeMobileLog ? (
                <>
                  <SheetHeader>
                    <SheetTitle>{mobileSelection?.type === "login" ? "Login Activity" : "Audit Event"}</SheetTitle>
                    <SheetDescription>Review the selected activity details for accountability and compliance.</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto pr-1">
                    {mobileSelection?.type === "login" ? (
                      <>
                        <DetailRow label="Email" value={(activeMobileLog as LoginLogItem).email} />
                        <DetailRow label="Role" value={(activeMobileLog as LoginLogItem).role.replace("_", " ")} />
                        <DetailRow label="UID" value={(activeMobileLog as LoginLogItem).uid} />
                        <DetailRow label="Time" value={formatDate((activeMobileLog as LoginLogItem).createdAt)} />
                        <DetailRow label="Device" value="Not captured yet" />
                        <DetailRow label="Session Duration" value="Not captured yet" />
                      </>
                    ) : (
                      <>
                        <DetailRow label="Action" value={(activeMobileLog as AuditLogItem).action} />
                        <DetailRow label="Actor" value={(activeMobileLog as AuditLogItem).actorEmail || "System"} />
                        <DetailRow label="Role" value={(activeMobileLog as AuditLogItem).actorRole || "Unknown"} />
                        <DetailRow label="Entity Type" value={(activeMobileLog as AuditLogItem).entityType} />
                        <DetailRow label="Entity ID" value={(activeMobileLog as AuditLogItem).entityId} />
                        <DetailRow label="Time" value={formatDate((activeMobileLog as AuditLogItem).createdAt)} />
                        {(activeMobileLog as AuditLogItem).metadata
                          ? Object.entries((activeMobileLog as AuditLogItem).metadata || {}).map(([key, value]) => (
                              <DetailRow key={key} label={key} value={typeof value === "string" ? value : JSON.stringify(value)} />
                            ))
                          : <DetailRow label="Metadata" value="No additional metadata captured." />}
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
