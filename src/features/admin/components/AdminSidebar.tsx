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
import { LogOut, MoreHorizontal, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import type { AdminNavSection, AdminSection } from "@/features/admin/types";
import { getInitials } from "@/features/admin/utils";

interface AdminSidebarProps {
  activeSection: AdminSection;
  commerceSections: AdminNavSection[];
  governanceSections: AdminNavSection[];
  mainSections: AdminNavSection[];
  onLogout: () => Promise<void>;
  onMarkAllNotificationsRead: () => Promise<void>;
  session: AdminSession;
  setActiveSection: (section: AdminSection) => void;
  setSidebarOpen: (next: boolean | ((value: boolean) => boolean)) => void;
  sidebarOpen: boolean;
  unreadNotifications: number;
}

export function AdminSidebar({
  activeSection,
  commerceSections,
  governanceSections,
  mainSections,
  onLogout,
  onMarkAllNotificationsRead,
  session,
  setActiveSection,
  setSidebarOpen,
  sidebarOpen,
  unreadNotifications,
}: AdminSidebarProps) {
  return (
    <Sidebar className="hidden md:flex">
      <SidebarHeader>
        <div className="flex items-start justify-between gap-3">
          <div className={cn("min-w-0", !sidebarOpen && "hidden")}>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">DWBB Academy</p>
            <h1 className="mt-3 text-2xl font-bold text-slate-950">Admin Console</h1>
            <p className="mt-2 text-sm leading-7 text-slate-500">Courses, inflows, team access, and payment intelligence in one place.</p>
          </div>
          <SidebarTrigger className={cn("h-10 w-10 rounded-xl px-0 shadow-none hover:translate-y-0", sidebarOpen ? "shrink-0" : "mx-auto")}>
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
        <div className={cn("rounded-xl border border-slate-200 bg-slate-50", sidebarOpen ? "p-3" : "p-2")}>
          <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {sidebarOpen ? (
                  <button className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left transition-colors hover:bg-white">
                    <Avatar className="h-10 w-10 text-xs" initials={getInitials(session.user.email)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-950">{session.user.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{session.user.role.replace("_", " ")}</p>
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                  </button>
                ) : (
                  <button className="rounded-xl p-1 transition-colors hover:bg-white">
                    <Avatar className="h-10 w-10 text-xs" initials={getInitials(session.user.email)} />
                    <span className="sr-only">Open account menu</span>
                  </button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuLabel>{session.user.email}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setActiveSection("notifications")}>
                  Notifications{unreadNotifications > 0 ? ` (${unreadNotifications})` : ""}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={unreadNotifications === 0} onClick={onMarkAllNotificationsRead}>
                  Mark all notifications read
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSidebarOpen((open) => !open)}>
                  {sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {sidebarOpen ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", session.mode === "live" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                {session.mode.toUpperCase()} MODE
              </span>
              <Button className="rounded-xl px-3 shadow-none hover:translate-y-0" onClick={onLogout} variant="ghost">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : null}
        </div>
      </SidebarFooter>
    </Sidebar>
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
