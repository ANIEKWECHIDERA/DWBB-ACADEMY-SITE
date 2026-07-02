import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { AdminHeader } from "@/features/admin/components/AdminHeader";
import {
  AdminPanel,
  EmptyState,
} from "@/features/admin/components/AdminPrimitives";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { AdminAdminsSection } from "@/features/admin/components/sections/AdminAdminsSection";
import { AdminCoursesSection } from "@/features/admin/components/sections/AdminCoursesSection";
import { AdminCustomersSection } from "@/features/admin/components/sections/AdminCustomersSection";
import { AdminLogsSection } from "@/features/admin/components/sections/AdminLogsSection";
import { AdminNotificationsSection } from "@/features/admin/components/sections/AdminNotificationsSection";
import { AdminOverviewSection } from "@/features/admin/components/sections/AdminOverviewSection";
import { AdminTransactionsSection } from "@/features/admin/components/sections/AdminTransactionsSection";
import { useAdminConsole } from "@/features/admin/hooks/useAdminConsole";

export default function AdminConsole() {
  const admin = useAdminConsole();

  if (admin.loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3">
          <Spinner className="border-white border-r-transparent" />
          <span>Preparing admin console...</span>
        </div>
      </div>
    );
  }

  if (!admin.firebaseUser || !admin.session) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,201,76,0.2),_transparent_40%),linear-gradient(180deg,_#081529_0%,_#0d223f_100%)] px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
          <AdminPanel className="w-full max-w-xl border-white/10 bg-white/95 text-slate-950 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">
              DWBB Admin
            </p>
            <h1 className="mt-4 text-4xl font-bold text-slate-950">
              Secure console access
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Sign in with Google to access the academy console.
            </p>
            {admin.authorizationError ? (
              <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {admin.authorizationError}
              </div>
            ) : null}
            <Button
              className="mt-8 w-full rounded-lg shadow-none hover:translate-y-0"
              onClick={admin.handleGoogleSignIn}
              variant="gold"
            >
              Continue with Google
            </Button>
          </AdminPanel>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      className="h-screen overflow-hidden bg-slate-100"
      onOpenChange={admin.setSidebarOpen}
      open={admin.sidebarOpen}
    >
      <div className="flex h-screen w-full overflow-hidden">
        <AdminSidebar
          activeSection={admin.activeSection}
          commerceSections={admin.commerceSections}
          governanceSections={admin.governanceSections}
          mainSections={admin.mainSections}
          mobileSidebarOpen={admin.mobileSidebarOpen}
          onLogout={admin.handleLogout}
          onMarkAllNotificationsRead={admin.handleMarkAllNotificationsRead}
          onNotificationsOpen={admin.loadNotificationsOnce}
          session={admin.session}
          setActiveSection={admin.setActiveSection}
          setMobileSidebarOpen={admin.setMobileSidebarOpen}
          setSidebarOpen={admin.setSidebarOpen}
          sidebarOpen={admin.sidebarOpen}
          unreadNotifications={admin.unreadNotifications}
        />

        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
          <AdminHeader
            activeSection={admin.activeSection}
            onOpenMobileSidebar={() => admin.setMobileSidebarOpen(true)}
            onOpenNotifications={() => admin.setActiveSection("notifications")}
            unreadNotifications={admin.unreadNotifications}
          />

          <div className="relative mt-4 flex-1 overflow-hidden sm:mt-6">
            {admin.isPageBusy ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-100/75 backdrop-blur-[1px]">
                <div className="flex flex-col items-center gap-3 text-center text-slate-600">
                  <Spinner className="text-slate-500" size="lg" />
                  <p className="text-sm font-medium">
                    {admin.mutating
                      ? admin.mutationLabel
                      : "Refreshing data..."}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="h-full overflow-y-auto pb-8 pr-1">
              <div
                className={
                  admin.isPageBusy ? "pointer-events-none select-none" : ""
                }
              >
                {admin.activeSection === "overview" ? (
                  <AdminOverviewSection
                    dashboard={admin.dashboard}
                    range={admin.overviewRange}
                    setRange={admin.setOverviewRange}
                  />
                ) : null}

                {admin.activeSection === "courses" ? (
                  <AdminCoursesSection
                    courseDraft={admin.courseDraft}
                    courses={admin.courses}
                    onChangeDraft={admin.setCourseDraft}
                    onDeleteCourse={admin.handleDeleteCourse}
                    onDeleteCourseAsset={admin.handleDeleteCourseAsset}
                    onDragEnd={admin.handleCourseDragEnd}
                    isBusy={admin.mutating}
                    mutationLabel={admin.mutationLabel}
                    onSaveCourse={admin.handleSaveCourse}
                    onUploadCourseAsset={admin.handleUploadCourseAsset}
                    pricingPreview={admin.pricingPreview}
                    selectedCourseSlug={admin.selectedCourseSlug}
                    selectCourse={admin.selectCourse}
                  />
                ) : null}

                {admin.activeSection === "notifications" ? (
                  <AdminNotificationsSection
                    notifications={admin.notifications}
                    onDismissNotification={admin.handleDismissNotification}
                    onMarkAllNotificationsRead={
                      admin.handleMarkAllNotificationsRead
                    }
                    onNotificationStatus={admin.handleNotificationStatus}
                    session={admin.session}
                    setActiveSection={() =>
                      admin.setActiveSection("transactions")
                    }
                    unreadNotifications={admin.unreadNotifications}
                  />
                ) : null}

                {admin.activeSection === "transactions" ? (
                  <AdminTransactionsSection
                    onDeleteTransactions={admin.handleDeleteTransactions}
                    onRangeChange={admin.setTransactionsRange}
                    range={admin.transactionsRange}
                    selectedTransactions={admin.selectedTransactions}
                    setSelectedTransactions={admin.setSelectedTransactions}
                    toggleSelection={admin.toggleSelection}
                    transactions={admin.transactions}
                  />
                ) : null}

                {admin.activeSection === "customers" ? (
                  <AdminCustomersSection
                    customers={admin.customers}
                    onDeleteCustomers={admin.handleDeleteCustomers}
                    selectedCustomers={admin.selectedCustomers}
                    setSelectedCustomers={admin.setSelectedCustomers}
                    toggleSelection={admin.toggleSelection}
                  />
                ) : null}

                {admin.activeSection === "logs" ? (
                  <AdminLogsSection
                    auditLogs={admin.auditLogs}
                    loginLogs={admin.loginLogs}
                    onSyncAuditLogs={admin.handleSyncAuditLogs}
                    pendingAuditLogCount={admin.pendingAuditLogCount}
                    range={admin.logsRange}
                    setRange={admin.setLogsRange}
                    setUserFilter={admin.setLogsUserFilter}
                    userFilter={admin.logsUserFilter}
                    userOptions={admin.logUserOptions}
                  />
                ) : null}

                {admin.activeSection === "admins" ? (
                  <AdminAdminsSection
                    adminUsers={admin.adminUsers}
                    inviteEmail={admin.inviteEmail}
                    inviteEmailValid={admin.inviteEmailValid}
                    inviteRole={admin.inviteRole}
                    isBusy={admin.mutating}
                    mutationLabel={admin.mutationLabel}
                    onDeleteAdmin={admin.handleDeleteAdminDirectoryUser}
                    onInviteAdmin={admin.handleInviteAdmin}
                    onUpdateAdmin={admin.handleUpdateAdminDirectoryUser}
                    session={admin.session}
                    setInviteEmail={admin.setInviteEmail}
                    setInviteRole={admin.setInviteRole}
                  />
                ) : null}

                {![
                  "overview",
                  "courses",
                  "notifications",
                  "transactions",
                  "customers",
                  "logs",
                  "admins",
                ].includes(admin.activeSection) ? (
                  <EmptyState
                    title="Section unavailable"
                    description="This admin section is not available right now."
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
