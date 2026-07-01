import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { adminRanges } from "@/features/admin/constants";
import { AdminHeader } from "@/features/admin/components/AdminHeader";
import { AdminPanel, EmptyState } from "@/features/admin/components/AdminPrimitives";
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
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">DWBB Admin</p>
            <h1 className="mt-4 text-4xl font-bold text-slate-950">Secure console access</h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Sign in with Google to access the academy console. The admin workspace stays hidden until Firebase authentication
              succeeds and your email is approved on the server.
            </p>
            {admin.authorizationError ? (
              <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{admin.authorizationError}</div>
            ) : null}
            <Button className="mt-8 w-full rounded-lg shadow-none hover:translate-y-0" onClick={admin.handleGoogleSignIn} variant="gold">
              Continue with Google
            </Button>
          </AdminPanel>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider className="h-screen overflow-hidden bg-slate-100" onOpenChange={admin.setSidebarOpen} open={admin.sidebarOpen}>
      <div className="mx-auto flex h-screen max-w-[1600px] overflow-hidden">
        <AdminSidebar
          activeSection={admin.activeSection}
          commerceSections={admin.commerceSections}
          governanceSections={admin.governanceSections}
          mainSections={admin.mainSections}
          onLogout={admin.handleLogout}
          onMarkAllNotificationsRead={admin.handleMarkAllNotificationsRead}
          session={admin.session}
          setActiveSection={admin.setActiveSection}
          setSidebarOpen={admin.setSidebarOpen}
          sidebarOpen={admin.sidebarOpen}
          unreadNotifications={admin.unreadNotifications}
        />

        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
          <AdminHeader
            activeSection={admin.activeSection}
            mobileSections={admin.visibleSections}
            onLogout={admin.handleLogout}
            onSelectRange={admin.setRange}
            onSelectSection={admin.setActiveSection}
            range={admin.range}
            ranges={adminRanges}
            shouldShowRangeFilter={admin.shouldShowRangeFilter}
          />

          <div className="mt-4 flex-1 overflow-y-auto pb-8 pr-1 sm:mt-6">
            {admin.loadingData ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-slate-600">
                <Spinner className="text-slate-500" />
                Refreshing admin data...
              </div>
            ) : null}

            <div className={admin.loadingData ? "mt-6" : ""}>
              {admin.activeSection === "overview" ? <AdminOverviewSection dashboard={admin.dashboard} /> : null}

              {admin.activeSection === "courses" ? (
                <AdminCoursesSection
                  courseDraft={admin.courseDraft}
                  courses={admin.courses}
                  onChangeDraft={admin.setCourseDraft}
                  onDeleteCourse={admin.handleDeleteCourse}
                  onDragEnd={admin.handleCourseDragEnd}
                  onSaveCourse={admin.handleSaveCourse}
                  pricingPreview={admin.pricingPreview}
                  selectedCourseSlug={admin.selectedCourseSlug}
                  selectCourse={admin.selectCourse}
                />
              ) : null}

              {admin.activeSection === "notifications" ? (
                <AdminNotificationsSection
                  notifications={admin.notifications}
                  onDismissNotification={admin.handleDismissNotification}
                  onMarkAllNotificationsRead={admin.handleMarkAllNotificationsRead}
                  onNotificationStatus={admin.handleNotificationStatus}
                  session={admin.session}
                  setActiveSection={() => admin.setActiveSection("transactions")}
                  unreadNotifications={admin.unreadNotifications}
                />
              ) : null}

              {admin.activeSection === "transactions" ? (
                <AdminTransactionsSection
                  onDeleteTransactions={admin.handleDeleteTransactions}
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

              {admin.activeSection === "logs" ? <AdminLogsSection auditLogs={admin.auditLogs} loginLogs={admin.loginLogs} /> : null}

              {admin.activeSection === "admins" ? (
                <AdminAdminsSection
                  adminUsers={admin.adminUsers}
                  inviteEmail={admin.inviteEmail}
                  inviteEmailValid={admin.inviteEmailValid}
                  inviteRole={admin.inviteRole}
                  onInviteAdmin={admin.handleInviteAdmin}
                  setInviteEmail={admin.setInviteEmail}
                  setInviteRole={admin.setInviteRole}
                />
              ) : null}

              {!["overview", "courses", "notifications", "transactions", "customers", "logs", "admins"].includes(admin.activeSection) ? (
                <EmptyState title="Section unavailable" description="This admin section is not available right now." />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
