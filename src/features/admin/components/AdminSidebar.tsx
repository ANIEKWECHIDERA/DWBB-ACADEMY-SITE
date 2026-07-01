import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupHeader,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { AdminSession } from "@/types/admin";
import { LogOut, MoreHorizontal, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import type { AdminNavSection, AdminSection } from "@/features/admin/types";
import { getInitials } from "@/features/admin/utils";

interface AdminSidebarProps {
  activeSection: AdminSection;
  commerceSections: AdminNavSection[];
  governanceSections: AdminNavSection[];
  mainSections: AdminNavSection[];
  onLogout: () => Promise<void>;
  onMarkAllNotificationsRead: () => Promise<void>;
  mobileSidebarOpen: boolean;
  session: AdminSession;
  setActiveSection: (section: AdminSection) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setSidebarOpen: (next: boolean | ((value: boolean) => boolean)) => void;
  sidebarOpen: boolean;
  unreadNotifications: number;
}

export function AdminSidebar({
  activeSection,
  commerceSections,
  governanceSections,
  mainSections,
  mobileSidebarOpen,
  onLogout,
  onMarkAllNotificationsRead,
  session,
  setActiveSection,
  setMobileSidebarOpen,
  setSidebarOpen,
  sidebarOpen,
  unreadNotifications,
}: AdminSidebarProps) {
  return (
    <>
      <Sidebar className="hidden md:flex">
        <SidebarHeader>
          <div className="flex items-start justify-between gap-3">
            <div className={cn("min-w-0", !sidebarOpen && "hidden")}>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">DWBB Academy</p>
              <h1 className="mt-3 text-2xl font-bold text-slate-950">Admin Console</h1>
              <p className="mt-2 text-sm leading-7 text-slate-500">Courses, inflows, team access, and payment intelligence in one place.</p>
            </div>
            <SidebarTrigger className={cn("h-10 w-10 rounded-lg px-0 shadow-none hover:translate-y-0", sidebarOpen ? "shrink-0" : "mx-auto")}>
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              <span className="sr-only">{sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}</span>
            </SidebarTrigger>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarSection activeSection={activeSection} sections={mainSections} sidebarOpen={sidebarOpen} title="Main" onSelect={setActiveSection} />
          <SidebarSection activeSection={activeSection} sections={commerceSections} sidebarOpen={sidebarOpen} title="Commerce" onSelect={setActiveSection} />
          {governanceSections.length > 0 ? (
            <SidebarSection activeSection={activeSection} sections={governanceSections} sidebarOpen={sidebarOpen} title="Governance" onSelect={setActiveSection} />
          ) : null}
        </SidebarContent>

        <SidebarFooter>
          <SidebarAccountPanel
            onLogout={onLogout}
            onMarkAllNotificationsRead={onMarkAllNotificationsRead}
            session={session}
            setActiveSection={setActiveSection}
            setSidebarOpen={setSidebarOpen}
            sidebarOpen={sidebarOpen}
            unreadNotifications={unreadNotifications}
          />
        </SidebarFooter>
      </Sidebar>

      <div className={cn("fixed inset-0 z-40 bg-slate-950/45 transition-opacity md:hidden", mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0")} onClick={() => setMobileSidebarOpen(false)} />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">DWBB Academy</p>
            <h1 className="mt-2 text-xl font-bold text-slate-950">Admin Console</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Navigate sections, review updates, and manage the academy on mobile.</p>
          </div>
          <Button className="h-10 w-10 rounded-lg px-0 shadow-none hover:translate-y-0" onClick={() => setMobileSidebarOpen(false)} variant="ghost">
            <X className="h-4 w-4" />
            <span className="sr-only">Close navigation</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-5">
          <MobileSidebarSection activeSection={activeSection} sections={mainSections} title="Main" onSelect={setActiveSection} />
          <MobileSidebarSection activeSection={activeSection} sections={commerceSections} title="Commerce" onSelect={setActiveSection} />
          {governanceSections.length > 0 ? <MobileSidebarSection activeSection={activeSection} sections={governanceSections} title="Governance" onSelect={setActiveSection} /> : null}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <SidebarAccountPanel
            mobile
            onLogout={onLogout}
            onMarkAllNotificationsRead={onMarkAllNotificationsRead}
            session={session}
            setActiveSection={setActiveSection}
            setSidebarOpen={setSidebarOpen}
            sidebarOpen={sidebarOpen}
            unreadNotifications={unreadNotifications}
          />
        </div>
      </aside>
    </>
  );
}

function SidebarSection({
  activeSection,
  onSelect,
  sections,
  sidebarOpen,
  title,
}: {
  activeSection: AdminSection;
  onSelect: (section: AdminSection) => void;
  sections: AdminNavSection[];
  sidebarOpen: boolean;
  title: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupHeader>
        <SidebarGroupLabel>{title}</SidebarGroupLabel>
      </SidebarGroupHeader>
      <SidebarGroupContent>
        <SidebarMenu>
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <SidebarMenuItem key={section.id}>
                <SidebarMenuButton active={activeSection === section.id} onClick={() => onSelect(section.id)} tooltip={section.label} type="button">
                  <Icon className="h-4 w-4" />
                  <span className={cn(!sidebarOpen && "hidden")}>{section.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function MobileSidebarSection({
  activeSection,
  onSelect,
  sections,
  title,
}: {
  activeSection: AdminSection;
  onSelect: (section: AdminSection) => void;
  sections: AdminNavSection[];
  title: string;
}) {
  return (
    <div className="mb-6">
      <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-2 space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-colors",
                activeSection === section.id ? "bg-deep-blue text-white" : "text-slate-700 hover:bg-slate-100",
              )}
              onClick={() => onSelect(section.id)}
              type="button"
            >
              <Icon className="h-4 w-4" />
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SidebarAccountPanel({
  mobile = false,
  onLogout,
  onMarkAllNotificationsRead,
  session,
  setActiveSection,
  setSidebarOpen,
  sidebarOpen,
  unreadNotifications,
}: {
  mobile?: boolean;
  onLogout: () => Promise<void>;
  onMarkAllNotificationsRead: () => Promise<void>;
  session: AdminSession;
  setActiveSection: (section: AdminSection) => void;
  setSidebarOpen: (next: boolean | ((value: boolean) => boolean)) => void;
  sidebarOpen: boolean;
  unreadNotifications: number;
}) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-slate-50", mobile ? "p-3" : sidebarOpen ? "p-3" : "p-2")}>
      <div className={cn("flex items-center gap-3", !mobile && !sidebarOpen && "justify-center")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {mobile || sidebarOpen ? (
              <button className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-white">
                <Avatar className="h-10 w-10 text-xs" initials={getInitials(session.user.email)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-950">{session.user.email}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{session.user.role.replace("_", " ")}</p>
                </div>
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
              </button>
            ) : (
              <button className="rounded-lg p-1 transition-colors hover:bg-white">
                <Avatar className="h-10 w-10 text-xs" initials={getInitials(session.user.email)} />
                <span className="sr-only">Open account menu</span>
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side={mobile ? "top" : "top"}>
            <DropdownMenuLabel>{session.user.email}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setActiveSection("notifications")}>
              Notifications{unreadNotifications > 0 ? ` (${unreadNotifications})` : ""}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={unreadNotifications === 0} onClick={onMarkAllNotificationsRead}>
              Mark all notifications read
            </DropdownMenuItem>
            {!mobile ? (
              <DropdownMenuItem onClick={() => setSidebarOpen((open) => !open)}>
                {sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {(mobile || sidebarOpen) ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", session.mode === "live" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
            {session.mode.toUpperCase()} MODE
          </span>
          <Button className="rounded-lg px-3 shadow-none hover:translate-y-0" onClick={onLogout} variant="ghost">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      ) : null}
    </div>
  );
}
