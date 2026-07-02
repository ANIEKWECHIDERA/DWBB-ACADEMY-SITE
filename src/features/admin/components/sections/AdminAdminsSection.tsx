import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AdminDirectoryUser, AdminRole, AdminSession } from "@/types/admin";

import { AdminPanel, ConfirmDialog, EmptyState, Field, ToggleField } from "../AdminPrimitives";

export function AdminAdminsSection({
  adminUsers,
  inviteEmail,
  inviteEmailValid,
  inviteRole,
  isBusy,
  mutationLabel,
  onDeleteAdmin,
  onInviteAdmin,
  onUpdateAdmin,
  session,
  setInviteEmail,
  setInviteRole,
}: {
  adminUsers: AdminDirectoryUser[];
  inviteEmail: string;
  inviteEmailValid: boolean;
  inviteRole: "admin" | "super_admin";
  isBusy: boolean;
  mutationLabel: string;
  onDeleteAdmin: (email: string) => Promise<void>;
  onInviteAdmin: () => Promise<void>;
  onUpdateAdmin: (email: string, role: AdminRole, active: boolean) => Promise<void>;
  session: AdminSession | null;
  setInviteEmail: (value: string) => void;
  setInviteRole: (role: "admin" | "super_admin") => void;
}) {
  const [mobileView, setMobileView] = useState<"invite" | "directory">("invite");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [desktopDialogOpen, setDesktopDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [draftRole, setDraftRole] = useState<AdminRole>("admin");
  const [draftActive, setDraftActive] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const selectedUser = useMemo(() => adminUsers.find((user) => user.email === selectedEmail) || null, [adminUsers, selectedEmail]);
  const isSelf = selectedUser?.email === session?.user.email;
  const isProtected = Boolean(selectedUser?.protected);
  const isSavingAdmin = isBusy && mutationLabel.toLowerCase().includes("saving admin access");
  const isDeletingAdmin = isBusy && mutationLabel.toLowerCase().includes("deleting admin");
  const isDirectoryDirty = selectedUser ? selectedUser.role !== draftRole || selectedUser.active !== draftActive : false;

  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    setDraftRole(selectedUser.role);
    setDraftActive(selectedUser.active);
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) {
      setMobileSheetOpen(false);
      setDesktopDialogOpen(false);
    }
  }, [selectedUser]);

  async function handleSaveAdmin() {
    if (!selectedUser) {
      return;
    }

    await onUpdateAdmin(selectedUser.email, draftRole, draftActive);
    setMobileSheetOpen(false);
    setDesktopDialogOpen(false);
  }

  async function handleDeleteSelectedAdmin() {
    if (!selectedUser) {
      return;
    }

    await onDeleteAdmin(selectedUser.email);
    setDeleteDialogOpen(false);
    setMobileSheetOpen(false);
    setDesktopDialogOpen(false);
    setSelectedEmail("");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="lg:hidden">
        <AdminPanel className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Admin Workspace</p>
          <Tabs
            className="mt-4"
            items={["Invite", "Directory"]}
            onChange={(value) => setMobileView(value === "Directory" ? "directory" : "invite")}
            value={mobileView === "directory" ? "Directory" : "Invite"}
          />
        </AdminPanel>
      </div>

      <AdminPanel className={cn("lg:block", mobileView === "invite" ? "block" : "hidden lg:block")}>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Onboard Admin</p>
        <div className="mt-6 space-y-4">
          <Field label="Google account email">
            <Input className="rounded-lg" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
          </Field>
          <Field label="Role">
            <Select className="rounded-lg" onChange={(event) => setInviteRole(event.target.value as "admin" | "super_admin")} value={inviteRole}>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </Select>
          </Field>
          <Button className="w-full rounded-lg shadow-none hover:translate-y-0 disabled:bg-slate-200 disabled:text-slate-400" disabled={!inviteEmailValid || isBusy} onClick={onInviteAdmin} variant="gold">
            {isSavingAdmin ? <Spinner className="border-deep-blue border-r-transparent" size="sm" /> : null}
            Save Access
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel className={cn("lg:block", mobileView === "directory" ? "block" : "hidden lg:block")}>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Current Admin Directory</p>
        <div className="mt-6 space-y-3">
          {adminUsers.length === 0 ? (
            <EmptyState title="No additional admins yet" description="Invite admins here once the team is ready to access the console." compact />
          ) : (
            adminUsers.map((user) => (
              <button
                key={user.email}
                className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 p-4 text-left transition hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between"
                onClick={() => {
                  setSelectedEmail(user.email);
                  if (window.matchMedia("(max-width: 1023px)").matches) {
                    setMobileSheetOpen(true);
                    return;
                  }

                  setDesktopDialogOpen(true);
                }}
                type="button"
              >
                <div>
                  <p className="font-semibold text-slate-950">{user.email}</p>
                  <p className="mt-1 text-sm text-slate-500">{user.protected ? "primary super admin" : user.role.replace("_", " ")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {user.protected ? (
                    <span className="inline-flex rounded-full bg-brand-gold/20 px-3 py-1 text-xs font-semibold text-slate-950">
                      Protected
                    </span>
                  ) : null}
                  <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", user.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700")}>
                    {user.active ? "Active" : "Disabled"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </AdminPanel>

      <Sheet onOpenChange={setMobileSheetOpen} open={mobileSheetOpen}>
        <SheetContent className="lg:hidden">
          {selectedUser ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedUser.email}</SheetTitle>
                <SheetDescription>Update access level, active status, or remove this admin entirely.</SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-6 overflow-y-auto pr-1">
                <Field label="Access Level">
                  <Select className="rounded-lg" disabled={isBusy || isSelf || isProtected} onChange={(event) => setDraftRole(event.target.value as AdminRole)} value={draftRole}>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </Select>
                </Field>
                <ToggleField checked={draftActive} disabled={isBusy || isSelf || isProtected} label="Admin is active" onChange={setDraftActive} />
                {isProtected ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    This protected super admin account is controlled by server configuration and cannot be changed or deleted from the console.
                  </div>
                ) : null}
                {isSelf ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Your current admin account cannot be edited or deleted from this mobile directory sheet.
                  </div>
                ) : null}
              </div>
              <SheetFooter>
                <Button
                  className="rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0"
                  disabled={isBusy || isSelf || isProtected}
                  onClick={() => setDeleteDialogOpen(true)}
                  variant="ghost"
                >
                  {isDeletingAdmin ? <Spinner className="text-rose-700" size="sm" /> : null}
                  Delete Admin
                </Button>
                <Button className="rounded-lg shadow-none hover:translate-y-0" disabled={!isDirectoryDirty || isBusy || isSelf || isProtected} onClick={handleSaveAdmin} variant="gold">
                  {isSavingAdmin ? <Spinner className="border-deep-blue border-r-transparent" size="sm" /> : null}
                  Save Changes
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog onOpenChange={setDesktopDialogOpen} open={desktopDialogOpen}>
        <DialogContent className="hidden lg:flex">
          {selectedUser ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedUser.email}</DialogTitle>
                <DialogDescription>Update access level, active status, or remove this admin entirely.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-2">
                <Field label="Access Level">
                  <Select className="rounded-lg" disabled={isBusy || isSelf || isProtected} onChange={(event) => setDraftRole(event.target.value as AdminRole)} value={draftRole}>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </Select>
                </Field>
                <ToggleField checked={draftActive} disabled={isBusy || isSelf || isProtected} label="Admin is active" onChange={setDraftActive} />
                {isProtected ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    This protected super admin account is controlled by server configuration and cannot be changed or deleted from the console.
                  </div>
                ) : null}
                {isSelf ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Your current admin account cannot be edited or deleted from this dialog.
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button
                  className="rounded-lg border border-rose-200 bg-white text-rose-700 shadow-none hover:bg-rose-50 hover:translate-y-0"
                  disabled={isBusy || isSelf || isProtected}
                  onClick={() => setDeleteDialogOpen(true)}
                  variant="ghost"
                >
                  {isDeletingAdmin ? <Spinner className="text-rose-700" size="sm" /> : null}
                  Delete Admin
                </Button>
                <Button className="rounded-lg shadow-none hover:translate-y-0" disabled={!isDirectoryDirty || isBusy || isSelf || isProtected} onClick={handleSaveAdmin} variant="gold">
                  {isSavingAdmin ? <Spinner className="border-deep-blue border-r-transparent" size="sm" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        confirmLabel="Delete admin"
        description={selectedUser ? `${selectedUser.email} will be removed from the admin directory.` : "This admin will be removed from the admin directory."}
        onConfirm={handleDeleteSelectedAdmin}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        title="Delete this admin?"
      />
    </div>
  );
}
