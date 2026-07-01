import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminDirectoryUser } from "@/types/admin";
import { cn } from "@/lib/utils";

import { AdminPanel, EmptyState, Field } from "../AdminPrimitives";

export function AdminAdminsSection({
  adminUsers,
  inviteEmail,
  inviteEmailValid,
  inviteRole,
  onInviteAdmin,
  setInviteEmail,
  setInviteRole,
}: {
  adminUsers: AdminDirectoryUser[];
  inviteEmail: string;
  inviteEmailValid: boolean;
  inviteRole: "admin" | "super_admin";
  onInviteAdmin: () => Promise<void>;
  setInviteEmail: (value: string) => void;
  setInviteRole: (role: "admin" | "super_admin") => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <AdminPanel>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Onboard Admin</p>
        <div className="mt-6 space-y-4">
          <Field label="Google account email">
            <Input className="rounded-lg" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
          </Field>
          <Field label="Role">
            <Select className="rounded-lg" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "super_admin")}>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </Select>
          </Field>
          <Button className="w-full rounded-lg shadow-none hover:translate-y-0 disabled:bg-slate-200 disabled:text-slate-400" disabled={!inviteEmailValid} onClick={onInviteAdmin} variant="gold">
            Save Access
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Current Admin Directory</p>
        <div className="mt-6 space-y-3">
          {adminUsers.length === 0 ? (
            <EmptyState title="No additional admins yet" description="Invite admins here once the team is ready to access the console." compact />
          ) : (
            adminUsers.map((user) => (
              <div key={user.email} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">{user.email}</p>
                  <p className="mt-1 text-sm text-slate-500">{user.role.replace("_", " ")}</p>
                </div>
                <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", user.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700")}>
                  {user.active ? "Active" : "Disabled"}
                </span>
              </div>
            ))
          )}
        </div>
      </AdminPanel>
    </div>
  );
}
