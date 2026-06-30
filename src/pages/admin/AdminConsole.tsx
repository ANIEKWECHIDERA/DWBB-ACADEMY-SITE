import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Bell,
  BarChart3,
  BookCopy,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  CreditCard,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentProps, type HTMLAttributes, type ReactNode } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupHeader,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  deleteAdminCourse,
  deleteAdminCustomers,
  deleteAdminTransactions,
  dismissAdminNotification,
  getAdminCourses,
  getAdminCustomers,
  getAdminDashboard,
  getAdminLogs,
  getAdminNotifications,
  getAdminSession,
  getAdminTransactions,
  getAdminUsers,
  markAdminNotification,
  markAllAdminNotificationsRead,
  reorderAdminCourses,
  updateAdminCourse,
  updateAdminUser,
  type AdminRange,
} from "@/lib/admin-api";
import { firebaseAuth } from "@/lib/firebase";
import { getCheckoutPricing } from "@/lib/paystackPricing";
import { cn } from "@/lib/utils";
import type {
  AdminCustomer,
  AdminDashboardMetrics,
  AdminDirectoryUser,
  AdminNotification,
  AdminSession,
  AdminTransaction,
  AuditLogItem,
  LoginLogItem,
  ManagedCourse,
} from "@/types/admin";

type AdminSection = "overview" | "courses" | "notifications" | "transactions" | "customers" | "logs" | "admins";

const ranges: Array<{ label: string; value: AdminRange }> = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "All Time", value: "all" },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatCurrencyFromKobo(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format((value || 0) / 100);
}

function formatCurrencyFromNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(value?: string) {
  if (!value) return "Just now";
  const target = new Date(value).getTime();
  const diffMs = target - Date.now();
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const minutes = Math.round(diffMs / (60 * 1000));
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");

  const hours = Math.round(diffMs / (60 * 60 * 1000));
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");

  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return formatter.format(days, "day");
}

function getInitials(value: string) {
  const parts = String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length > 0) {
    return parts.map((part) => part[0]?.toUpperCase() || "").join("");
  }

  return "DW";
}

function cloneCourseDraft(course: ManagedCourse | null) {
  return course ? { ...course, deliverables: [...course.deliverables] } : null;
}

function sourceCourseSlug(currentSlug: string, sourceCourses: ManagedCourse[]) {
  if (currentSlug && sourceCourses.some((course) => course.slug === currentSlug)) {
    return currentSlug;
  }

  return sourceCourses[0]?.slug || "";
}

function statusTone(status: string) {
  if (status === "success") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "failed") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
}

function SortableCourseRow({
  course,
  active,
  onSelect,
}: {
  course: ManagedCourse;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: course.slug });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left transition",
        active ? "border-brand-gold bg-brand-gold/10" : "border-slate-200 bg-white hover:border-slate-300",
      )}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <div>
        <p className="font-semibold text-slate-950">{course.title}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{course.slug}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-950">{formatCurrencyFromNaira(course.priceNaira)}</p>
        <p className="mt-1 text-xs text-slate-500">{course.published ? "Published" : "Hidden"}</p>
      </div>
    </button>
  );
}

export default function AdminConsole() {
  const { pushToast } = useToast();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authorizationError, setAuthorizationError] = useState("");

  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [range, setRange] = useState<AdminRange>("30d");
  const [loadingData, setLoadingData] = useState(false);

  const [dashboard, setDashboard] = useState<AdminDashboardMetrics | null>(null);
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [selectedCourseSlug, setSelectedCourseSlug] = useState("");
  const [courseDraft, setCourseDraft] = useState<ManagedCourse | null>(null);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLogItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminDirectoryUser[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "super_admin">("admin");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const selectedCourseSlugRef = useRef(selectedCourseSlug);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    selectedCourseSlugRef.current = selectedCourseSlug;
  }, [selectedCourseSlug]);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      setLoadingSession(true);
      setAuthorizationError("");
      setFirebaseUser(user);

      if (!user) {
        setSession(null);
        setLoadingSession(false);
        return;
      }

      try {
        const nextSession = await getAdminSession(user);
        setSession(nextSession);
      } catch (error) {
        setSession(null);
        setAuthorizationError(error instanceof Error ? error.message : "You do not have access to this console.");
      } finally {
        setLoadingSession(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser || !session) {
      return;
    }

    const currentUser = firebaseUser;
    const currentSession = session;
    let active = true;

    async function load() {
      setLoadingData(true);

      try {
        const [dashboardResult, courseResult] = await Promise.all([getAdminDashboard(currentUser, range), getAdminCourses(currentUser)]);

        if (!active) return;

        const nextSlug = sourceCourseSlug(selectedCourseSlugRef.current, courseResult);

        setDashboard(dashboardResult.metrics);
        setCourses(courseResult);
        setSelectedCourseSlug(nextSlug);
        setCourseDraft(cloneCourseDraft(courseResult.find((course) => course.slug === nextSlug) || null));

        const notificationResult = await getAdminNotifications(currentUser);
        if (!active) return;
        setNotifications(notificationResult.notifications);

        if (currentSession.permissions.canViewTransactions || currentSession.permissions.canViewCustomers) {
          const [transactionResult, customerResult] = await Promise.all([
            currentSession.permissions.canViewTransactions ? getAdminTransactions(currentUser, range) : Promise.resolve([]),
            currentSession.permissions.canViewCustomers ? getAdminCustomers(currentUser, range) : Promise.resolve([]),
          ]);

          if (!active) return;

          setTransactions(transactionResult);
          setCustomers(customerResult);
          setSelectedTransactions([]);
          setSelectedCustomers([]);
        }

        if (currentSession.permissions.canViewAuditLogs) {
          const logsResult = await getAdminLogs(currentUser);
          if (!active) return;
          setAuditLogs(logsResult.auditLogs);
          setLoginLogs(logsResult.loginLogs);
        }

        if (currentSession.permissions.canManageAdmins) {
          const users = await getAdminUsers(currentUser);
          if (!active) return;
          setAdminUsers(users);
        }
      } catch (error) {
        if (active) {
          pushToast({
            title: "Admin data unavailable",
            description: error instanceof Error ? error.message : "Unable to load the admin console data.",
          });
        }
      } finally {
        if (active) {
          setLoadingData(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [firebaseUser, pushToast, range, session]);

  const visibleSections = useMemo(() => {
    if (!session) return [];

    return [
      { id: "overview", label: "Overview", icon: LayoutGrid, visible: true },
      { id: "courses", label: "Courses", icon: BookCopy, visible: session.permissions.canManageCourses },
      { id: "notifications", label: "Notifications", icon: Bell, visible: true },
      { id: "transactions", label: "Transactions", icon: CreditCard, visible: session.permissions.canViewTransactions },
      { id: "customers", label: "Customers", icon: Users, visible: session.permissions.canViewCustomers },
      { id: "logs", label: "Audit Logs", icon: ClipboardList, visible: session.permissions.canViewAuditLogs },
      { id: "admins", label: "Admins", icon: ShieldCheck, visible: session.permissions.canManageAdmins },
    ].filter((item) => item.visible) as Array<{ id: AdminSection; label: string; icon: typeof LayoutGrid }>;
  }, [session]);

  const pricingPreview = courseDraft ? getCheckoutPricing(courseDraft.priceNaira) : null;
  const shouldShowRangeFilter = activeSection === "overview" || activeSection === "transactions" || activeSection === "logs";
  const inviteEmailValid = emailPattern.test(inviteEmail.trim());
  const directSections = visibleSections.filter((section) => section.id === "overview" || section.id === "courses");
  const commerceSections = visibleSections.filter((section) =>
    section.id === "notifications" || section.id === "transactions" || section.id === "customers",
  );
  const governanceSections = visibleSections.filter((section) => section.id === "logs" || section.id === "admins");
  const unreadNotifications = notifications.filter((item) => !item.readAt).length;

  function selectCourse(slug: string, sourceCourses = courses) {
    setSelectedCourseSlug(slug);
    const selected = sourceCourses.find((course) => course.slug === slug) || null;
    setCourseDraft(cloneCourseDraft(selected));
  }

  async function handleGoogleSignIn() {
    try {
      await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    } catch (error) {
      pushToast({
        title: "Sign-in failed",
        description: error instanceof Error ? error.message : "Unable to continue with Google sign-in.",
      });
    }
  }

  async function handleSaveCourse() {
    if (!firebaseUser || !courseDraft) return;

    try {
      const course = await updateAdminCourse(firebaseUser, selectedCourseSlug, {
        ...courseDraft,
        deliverables: courseDraft.deliverables.filter(Boolean),
      });
      const nextCourses = courses.map((item) => (item.slug === selectedCourseSlug ? course : item));
      setCourses(nextCourses);
      selectCourse(course.slug, nextCourses);
      pushToast({ title: "Course saved", description: `${course.title} was updated successfully.` });
    } catch (error) {
      pushToast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save the course right now.",
      });
    }
  }

  async function handleDeleteCourse() {
    if (!firebaseUser || !courseDraft) return;
    if (!window.confirm(`Delete ${courseDraft.title}? This action removes it from Firestore.`)) return;

    try {
      await deleteAdminCourse(firebaseUser, courseDraft.slug);
      const nextCourses = courses.filter((course) => course.slug !== courseDraft.slug);
      setCourses(nextCourses);
      selectCourse(nextCourses[0]?.slug || "", nextCourses);
      pushToast({ title: "Course deleted", description: `${courseDraft.title} was removed from the managed catalog.` });
    } catch (error) {
      pushToast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete the course right now.",
      });
    }
  }

  async function handleCourseDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !firebaseUser) return;

    const oldIndex = courses.findIndex((course) => course.slug === active.id);
    const newIndex = courses.findIndex((course) => course.slug === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextCourses = arrayMove(courses, oldIndex, newIndex).map((course, index) => ({ ...course, order: index }));
    setCourses(nextCourses);

    try {
      const savedCourses = await reorderAdminCourses(firebaseUser, nextCourses.map((course) => course.slug));
      setCourses(savedCourses);
    } catch (error) {
      pushToast({
        title: "Reorder failed",
        description: error instanceof Error ? error.message : "Unable to save the new course order.",
      });
    }
  }

  async function handleInviteAdmin() {
    if (!firebaseUser || !inviteEmail.trim()) return;

    try {
      const user = await updateAdminUser(firebaseUser, inviteEmail, inviteRole, true);
      setAdminUsers((current) => {
        const filtered = current.filter((item) => item.email !== user.email);
        return [...filtered, user].sort((a, b) => a.email.localeCompare(b.email));
      });
      setInviteEmail("");
      setInviteRole("admin");
      pushToast({ title: "Admin access updated", description: `${user.email} can now sign in as ${user.role.replace("_", " ")}.` });
    } catch (error) {
      pushToast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to update admin access right now.",
      });
    }
  }

  function toggleSelection(current: string[], value: string) {
    return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  }

  async function handleDeleteTransactions(references: string[]) {
    if (!firebaseUser || references.length === 0) return;
    if (!window.confirm(`Delete ${references.length} transaction record(s)?`)) return;

    try {
      await deleteAdminTransactions(firebaseUser, references);
      setTransactions((current) => current.filter((item) => !references.includes(item.reference)));
      setSelectedTransactions((current) => current.filter((item) => !references.includes(item)));
      pushToast({ title: "Transactions deleted", description: `${references.length} transaction record(s) removed.` });
    } catch (error) {
      pushToast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete the selected transactions.",
      });
    }
  }

  async function handleDeleteCustomers(emails: string[]) {
    if (!firebaseUser || emails.length === 0) return;
    if (!window.confirm(`Delete ${emails.length} customer record(s)?`)) return;

    try {
      await deleteAdminCustomers(firebaseUser, emails);
      setCustomers((current) => current.filter((item) => !emails.includes(item.email)));
      setSelectedCustomers((current) => current.filter((item) => !emails.includes(item)));
      pushToast({ title: "Customers deleted", description: `${emails.length} customer record(s) removed.` });
    } catch (error) {
      pushToast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete the selected customers.",
      });
    }
  }

  async function handleNotificationStatus(notificationId: string, status: "read" | "unread") {
    if (!firebaseUser) return;

    try {
      const payload = await markAdminNotification(firebaseUser, notificationId, status);
      const nextNotification = payload.notification;

      setNotifications((current) =>
        current.map((item) => (item.id === notificationId && nextNotification ? nextNotification : item)),
      );
    } catch (error) {
      pushToast({
        title: "Notification update failed",
        description: error instanceof Error ? error.message : "Unable to update this notification right now.",
      });
    }
  }

  async function handleDismissNotification(notificationId: string) {
    if (!firebaseUser) return;

    try {
      await dismissAdminNotification(firebaseUser, notificationId);
      setNotifications((current) => current.filter((item) => item.id !== notificationId));
    } catch (error) {
      pushToast({
        title: "Dismiss failed",
        description: error instanceof Error ? error.message : "Unable to dismiss this notification right now.",
      });
    }
  }

  async function handleMarkAllNotificationsRead() {
    if (!firebaseUser || unreadNotifications === 0) return;

    try {
      await markAllAdminNotificationsRead(firebaseUser);
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    } catch (error) {
      pushToast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to mark all notifications as read.",
      });
    }
  }

  async function handleLogout() {
    await signOut(firebaseAuth);
  }

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3">
          <Spinner className="border-white border-r-transparent" />
          <span>Preparing admin console...</span>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !session) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,201,76,0.2),_transparent_40%),linear-gradient(180deg,_#081529_0%,_#0d223f_100%)] px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
          <AdminPanel className="w-full max-w-xl border-white/10 bg-white/95 p-8 text-slate-950 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">DWBB Admin</p>
            <h1 className="mt-4 text-4xl font-bold text-slate-950">Secure console access</h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Sign in with Google to access the academy console. The admin workspace stays hidden until Firebase authentication
              succeeds and your email is approved on the server.
            </p>
            {authorizationError ? (
              <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{authorizationError}</div>
            ) : null}
            <AdminButton className="mt-8 w-full" onClick={handleGoogleSignIn} variant="gold">
              Continue with Google
            </AdminButton>
          </AdminPanel>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider className="overflow-x-hidden bg-slate-100" onOpenChange={setSidebarOpen} open={sidebarOpen}>
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <Sidebar className="hidden md:flex">
          <SidebarHeader>
            <div className="flex items-start justify-between gap-3">
              <div className={cn("min-w-0", !sidebarOpen && "hidden")}>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">DWBB Academy</p>
                <h1 className="mt-3 text-2xl font-bold text-slate-950">Admin Console</h1>
                <p className="mt-2 text-sm leading-7 text-slate-500">Courses, inflows, team access, and payment intelligence in one place.</p>
              </div>
              <SidebarTrigger className={cn("h-10 w-10 px-0", sidebarOpen ? "shrink-0" : "mx-auto")}>
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                <span className="sr-only">{sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}</span>
              </SidebarTrigger>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupHeader>
                <SidebarGroupLabel>Main</SidebarGroupLabel>
              </SidebarGroupHeader>
              <SidebarGroupContent>
                <SidebarMenu>
                  {directSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <SidebarMenuItem key={section.id}>
                        <SidebarMenuButton active={activeSection === section.id} onClick={() => setActiveSection(section.id)} tooltip={section.label} type="button">
                          <Icon className="h-4 w-4" />
                          <span className={cn(!sidebarOpen && "hidden")}>{section.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupHeader>
                <SidebarGroupLabel>Notifications</SidebarGroupLabel>
                <SidebarGroupAction disabled={unreadNotifications === 0} onClick={handleMarkAllNotificationsRead} tooltip="Mark all as read">
                  <CheckCheck className="h-4 w-4" />
                </SidebarGroupAction>
              </SidebarGroupHeader>
              <SidebarGroupContent>
                <SidebarMenu>
                  <Collapsible className="group/collapsible" defaultOpen>
                    <SidebarMenuItem>
                      <div className="relative">
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton active={activeSection === "notifications" || activeSection === "transactions" || activeSection === "customers"} tooltip="Commerce">
                            <Bell className="h-4 w-4" />
                            <span className={cn(!sidebarOpen && "hidden")}>Commerce</span>
                            {sidebarOpen ? <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" /> : null}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        {unreadNotifications > 0 ? <SidebarMenuBadge>{unreadNotifications}</SidebarMenuBadge> : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction showOnHover>
                              <span className="sr-only">Commerce actions</span>
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" side="right">
                            <DropdownMenuLabel>Commerce</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setActiveSection("notifications")}>Open notifications</DropdownMenuItem>
                            <DropdownMenuItem disabled={unreadNotifications === 0} onClick={handleMarkAllNotificationsRead}>
                              Mark all notifications read
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {commerceSections.map((section) => {
                            const Icon = section.icon;
                            const isNotification = section.id === "notifications";
                            return (
                              <SidebarMenuSubItem key={section.id}>
                                <SidebarMenuSubButton active={activeSection === section.id} onClick={() => setActiveSection(section.id)} type="button">
                                  <Icon className="h-4 w-4" />
                                  <span>{section.label}</span>
                                  {isNotification && unreadNotifications > 0 ? (
                                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                      {unreadNotifications}
                                    </span>
                                  ) : null}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {governanceSections.length > 0 ? (
              <SidebarGroup>
                <SidebarGroupHeader>
                  <SidebarGroupLabel>Governance</SidebarGroupLabel>
                </SidebarGroupHeader>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <Collapsible className="group/collapsible" defaultOpen={session.user.role === "super_admin"}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton active={activeSection === "logs" || activeSection === "admins"} tooltip="Governance">
                            <ShieldCheck className="h-4 w-4" />
                            <span className={cn(!sidebarOpen && "hidden")}>Governance</span>
                            {sidebarOpen ? <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" /> : null}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {governanceSections.map((section) => {
                              const Icon = section.icon;
                              return (
                                <SidebarMenuSubItem key={section.id}>
                                  <SidebarMenuSubButton active={activeSection === section.id} onClick={() => setActiveSection(section.id)} type="button">
                                    <Icon className="h-4 w-4" />
                                    <span>{section.label}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
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
                    <DropdownMenuItem onClick={() => setActiveSection("notifications")}>Notifications</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSidebarOpen((open) => !open)}>
                      {sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {sidebarOpen ? (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", session.mode === "live" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                    {session.mode.toUpperCase()} MODE
                  </span>
                  <AdminButton className="px-3" onClick={handleLogout} variant="ghost">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </AdminButton>
                </div>
              ) : null}
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="px-4 py-6 sm:px-6 lg:px-8">
          <AdminPanel className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">{activeSection}</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-950">Precision control for DWBB operations</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Manage pricing as net target values, review inflows, and keep admin activity auditable.
                </p>
              </div>

              <AdminButton className="md:hidden" onClick={handleLogout} variant="ghost">
                <LogOut className="h-4 w-4" />
                Logout
              </AdminButton>
            </div>

            <div className="flex gap-2 overflow-x-auto md:hidden">
              {visibleSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                      activeSection === section.id ? "bg-deep-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>

            {shouldShowRangeFilter ? (
              <div className="flex flex-wrap gap-2">
                {ranges.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-semibold transition",
                      range === option.value ? "bg-deep-blue text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </AdminPanel>

          {loadingData ? (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
              <Spinner className="text-slate-500" />
              Refreshing admin data...
            </div>
          ) : null}

          {activeSection === "overview" ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Activity} label="Gross Sales" value={formatCurrencyFromKobo(dashboard?.grossSalesKobo || 0)} />
                <MetricCard icon={BarChart3} label="Net Inflow" value={formatCurrencyFromKobo(dashboard?.netInflowKobo || 0)} />
                <MetricCard icon={CreditCard} label="Transactions" value={String(dashboard?.totalTransactions || 0)} />
                <MetricCard
                  icon={BookCopy}
                  label="Top Selling Course"
                  value={dashboard?.topSellingCourse?.courseTitle || "No payments yet"}
                  compact
                />
              </div>

              {!dashboard || (dashboard.inflowOverTime.length === 0 && dashboard.salesByCourse.length === 0) ? (
                <EmptyState
                  title="No overview data yet"
                  description="Once verified payments start flowing in, inflow charts and KPI insights will appear here."
                />
              ) : (
                <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                  <AdminPanel className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Inflow Over Time</p>
                        <h3 className="mt-2 text-2xl font-bold text-slate-950">Gross sales vs net inflow</h3>
                      </div>
                    </div>
                    <div className="mt-6 h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboard.inflowOverTime}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                          <Tooltip formatter={(value) => formatCurrencyFromKobo(Number(value || 0))} />
                          <Legend />
                          <Area dataKey="grossSalesKobo" name="Gross sales" fill="#f2c94c" stroke="#d4a514" fillOpacity={0.25} />
                          <Area dataKey="netInflowKobo" name="Net inflow" fill="#33a7ff" stroke="#0f6dc5" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </AdminPanel>

                  <AdminPanel className="p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Sales By Course</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-950">Course demand snapshot</h3>
                    <div className="mt-6 h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboard.salesByCourse}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <XAxis dataKey="courseTitle" hide />
                          <YAxis allowDecimals={false} />
                          <Tooltip formatter={(value, key) => (String(key) === "transactions" ? Number(value || 0) : formatCurrencyFromKobo(Number(value || 0)))} />
                          <Bar dataKey="transactions" name="Transactions" fill="#0f172a" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </AdminPanel>
                </div>
              )}
            </div>
          ) : null}

          {activeSection === "courses" ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.2fr]">
              <AdminPanel className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Catalog Order</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-950">Drag to reorder</h3>
                  </div>
                </div>
                <div className="mt-6">
                  {courses.length === 0 ? (
                    <EmptyState title="No courses yet" description="Managed courses will appear here once they exist in Firestore." compact />
                  ) : (
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleCourseDragEnd} sensors={sensors}>
                      <SortableContext items={courses.map((course) => course.slug)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                          {courses.map((course) => (
                            <SortableCourseRow key={course.slug} active={selectedCourseSlug === course.slug} course={course} onSelect={() => selectCourse(course.slug)} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </AdminPanel>

              <AdminPanel className="p-6">
                {courseDraft ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Slug">
                        <AdminInput value={courseDraft.slug} onChange={(event) => setCourseDraft({ ...courseDraft, slug: event.target.value })} />
                      </Field>
                      <Field label="Title">
                        <AdminInput value={courseDraft.title} onChange={(event) => setCourseDraft({ ...courseDraft, title: event.target.value })} />
                      </Field>
                    </div>

                    <Field label="Short Title">
                      <AdminInput value={courseDraft.shortTitle || ""} onChange={(event) => setCourseDraft({ ...courseDraft, shortTitle: event.target.value })} />
                    </Field>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Net Price You Want To Receive">
                        <AdminInput type="number" value={courseDraft.priceNaira} onChange={(event) => setCourseDraft({ ...courseDraft, priceNaira: Number(event.target.value || 0) })} />
                      </Field>
                      <Field label="Paystack Final Charge Preview">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          <p className="font-semibold text-slate-950">{formatCurrencyFromNaira(pricingPreview?.totalChargeNaira || 0)}</p>
                          <p className="mt-1 text-xs text-slate-500">Includes {formatCurrencyFromNaira(pricingPreview?.processingFeeNaira || 0)} processing fee</p>
                        </div>
                      </Field>
                    </div>

                    <Field label="Summary">
                      <AdminTextarea className="min-h-28" value={courseDraft.summary} onChange={(event) => setCourseDraft({ ...courseDraft, summary: event.target.value })} />
                    </Field>

                    <Field label="Long Description">
                      <AdminTextarea value={courseDraft.longDescription} onChange={(event) => setCourseDraft({ ...courseDraft, longDescription: event.target.value })} />
                    </Field>

                    <Field label="Deliverables">
                      <AdminTextarea
                        className="min-h-32"
                        value={courseDraft.deliverables.join("\n")}
                        onChange={(event) =>
                          setCourseDraft({
                            ...courseDraft,
                            deliverables: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                          })
                        }
                      />
                    </Field>

                    <div className="grid gap-4 md:grid-cols-2">
                      <ToggleField checked={courseDraft.published} label="Published" onChange={(checked) => setCourseDraft({ ...courseDraft, published: checked })} />
                      <ToggleField checked={courseDraft.featured} label="Featured listing" onChange={(checked) => setCourseDraft({ ...courseDraft, featured: checked })} />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <AdminButton onClick={handleSaveCourse} variant="gold">
                        Save Course
                      </AdminButton>
                      <AdminButton className="border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" onClick={handleDeleteCourse} variant="ghost">
                        Hard Delete
                      </AdminButton>
                    </div>
                  </div>
                ) : (
                  <EmptyState title="Select a course" description="Choose a course from the left to edit details, pricing, and publish state." compact />
                )}
              </AdminPanel>
            </div>
          ) : null}

          {activeSection === "notifications" ? (
            <div className="mt-6 space-y-6">
              <AdminPanel className="p-6">
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
                    <AdminButton disabled={unreadNotifications === 0} onClick={handleMarkAllNotificationsRead} variant="ghost">
                      <CheckCheck className="h-4 w-4" />
                      Mark all read
                    </AdminButton>
                  </div>
                </div>
              </AdminPanel>

              {notifications.length === 0 ? (
                <EmptyState
                  title="No notifications yet"
                  description="New purchase alerts will appear here automatically after verified Paystack payments."
                />
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <AdminPanel
                      key={notification.id}
                      className={cn(
                        "p-5 transition-colors",
                        !notification.readAt && "border-brand-gold/50 bg-brand-gold/5",
                      )}
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
                            <AdminButton
                              className="px-3"
                              onClick={() => setActiveSection("transactions")}
                              variant="ghost"
                            >
                              View transaction
                            </AdminButton>
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
                              <DropdownMenuItem onClick={() => handleNotificationStatus(notification.id, notification.readAt ? "unread" : "read")}>
                                Mark as {notification.readAt ? "unread" : "read"}
                              </DropdownMenuItem>
                              {notification.transactionReference && session.permissions.canViewTransactions ? (
                                <DropdownMenuItem onClick={() => setActiveSection("transactions")}>
                                  Open transactions
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDismissNotification(notification.id)}>
                                Dismiss
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </AdminPanel>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {activeSection === "transactions" ? (
            <AdminPanel className="mt-6 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Transaction Ledger</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">Verified payment records</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    className="border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                    disabled={selectedTransactions.length === 0}
                    onClick={() => handleDeleteTransactions(selectedTransactions)}
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </AdminButton>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="mt-6">
                  <EmptyState title="No transactions yet" description="Once payments are verified, transaction records will appear here." compact />
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="hover:bg-slate-50">
                        <TableHead className="w-12">
                          <input
                            checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                            onChange={(event) => setSelectedTransactions(event.target.checked ? transactions.map((item) => item.reference) : [])}
                            type="checkbox"
                          />
                        </TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Gross</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid At</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.reference}>
                          <TableCell>
                            <input
                              checked={selectedTransactions.includes(transaction.reference)}
                              onChange={() => setSelectedTransactions((current) => toggleSelection(current, transaction.reference))}
                              type="checkbox"
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-slate-950">{transaction.customerName}</p>
                              <p className="text-xs text-slate-500">{transaction.customerEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>{transaction.courseTitle}</TableCell>
                          <TableCell>{formatCurrencyFromKobo(transaction.chargedAmountKobo)}</TableCell>
                          <TableCell>{formatCurrencyFromKobo(transaction.coursePriceKobo)}</TableCell>
                          <TableCell>
                            <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", statusTone(transaction.status))}>
                              {transaction.status}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(transaction.paidAt)}</TableCell>
                          <TableCell className="text-right">
                            <AdminButton className="border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteTransactions([transaction.reference])} variant="ghost">
                              Delete
                            </AdminButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </AdminPanel>
          ) : null}

          {activeSection === "customers" ? (
            <AdminPanel className="mt-6 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Customers</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">Customer records mirrored from verified payments</h3>
                </div>
                <AdminButton
                  className="border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                  disabled={selectedCustomers.length === 0}
                  onClick={() => handleDeleteCustomers(selectedCustomers)}
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </AdminButton>
              </div>

              {customers.length === 0 ? (
                <div className="mt-6">
                  <EmptyState title="No customers yet" description="Customer records will appear after verified purchases are mirrored into Firestore." compact />
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="hover:bg-slate-50">
                        <TableHead className="w-12">
                          <input
                            checked={selectedCustomers.length === customers.length && customers.length > 0}
                            onChange={(event) => setSelectedCustomers(event.target.checked ? customers.map((item) => item.email) : [])}
                            type="checkbox"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Transactions</TableHead>
                        <TableHead>Net Inflow</TableHead>
                        <TableHead>Last Purchase</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.email}>
                          <TableCell>
                            <input checked={selectedCustomers.includes(customer.email)} onChange={() => setSelectedCustomers((current) => toggleSelection(current, customer.email))} type="checkbox" />
                          </TableCell>
                          <TableCell>{customer.name}</TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell>{customer.totalTransactions}</TableCell>
                          <TableCell>{formatCurrencyFromKobo(customer.totalNetKobo)}</TableCell>
                          <TableCell>{formatDate(customer.lastPurchaseAt)}</TableCell>
                          <TableCell className="text-right">
                            <AdminButton className="border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" onClick={() => handleDeleteCustomers([customer.email])} variant="ghost">
                              Delete
                            </AdminButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </AdminPanel>
          ) : null}

          {activeSection === "logs" ? (
            <div className="mt-6 space-y-6">
              {auditLogs.length === 0 && loginLogs.length === 0 ? (
                <EmptyState title="No audit activity yet" description="Admin session views, finance access, and sign-ins will appear here once the team starts using the console." />
              ) : (
                <div className="grid gap-6 xl:grid-cols-2">
                  <AdminPanel className="p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Audit Logs</p>
                    <div className="mt-6 space-y-3">
                      {auditLogs.length === 0 ? (
                        <EmptyState title="No audit logs yet" description="Action logs will appear here as admins use the console." compact />
                      ) : (
                        auditLogs.map((item) => (
                          <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                            <p className="font-semibold text-slate-950">{item.action}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.actorEmail || "System"}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                              {item.entityType} · {item.entityId} · {formatDate(item.createdAt)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </AdminPanel>

                  <AdminPanel className="p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Login Activity</p>
                    <div className="mt-6 space-y-3">
                      {loginLogs.length === 0 ? (
                        <EmptyState title="No login activity yet" description="Successful admin sign-ins will be listed here." compact />
                      ) : (
                        loginLogs.map((item) => (
                          <div key={item.id} className="rounded-xl border border-slate-200 p-4">
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
          ) : null}

          {activeSection === "admins" ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <AdminPanel className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Onboard Admin</p>
                <div className="mt-6 space-y-4">
                  <Field label="Google account email">
                    <AdminInput value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
                  </Field>
                  <Field label="Role">
                    <AdminSelect value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "super_admin")}>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </AdminSelect>
                  </Field>
                  <AdminButton className="w-full disabled:bg-slate-200 disabled:text-slate-400" disabled={!inviteEmailValid} onClick={handleInviteAdmin} variant="gold">
                    Save Access
                  </AdminButton>
                </div>
              </AdminPanel>

              <AdminPanel className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Current Admin Directory</p>
                <div className="mt-6 space-y-3">
                  {adminUsers.length === 0 ? (
                    <EmptyState title="No additional admins yet" description="Invite admins here once the team is ready to access the console." compact />
                  ) : (
                    adminUsers.map((user) => (
                      <div key={user.email} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
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
          ) : null}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function ToggleField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <span className="font-semibold text-slate-950">{label}</span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

function MetricCard({ icon: Icon, label, value, compact = false }: { icon: typeof Activity; label: string; value: string; compact?: boolean }) {
  return (
    <AdminPanel className="p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <Icon className="h-5 w-5 text-brand-gold" />
      </div>
      <p className={cn("mt-5 font-bold text-slate-950", compact ? "text-2xl" : "text-4xl")}>{value}</p>
    </AdminPanel>
  );
}

function EmptyState({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <AdminPanel className={cn("border-dashed p-8 text-center", compact ? "bg-slate-50" : "bg-white")}>
      <p className="text-xl font-semibold text-slate-950">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
    </AdminPanel>
  );
}

function AdminPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Card className={cn("rounded-2xl border-slate-200 shadow-none", className)} {...props} />;
}

function AdminButton({ className, ...props }: ComponentProps<typeof Button>) {
  return <Button className={cn("rounded-xl shadow-none hover:translate-y-0", className)} {...props} />;
}

function AdminInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input className={cn("rounded-xl", className)} {...props} />;
}

function AdminTextarea({ className, ...props }: ComponentProps<typeof Textarea>) {
  return <Textarea className={cn("rounded-xl", className)} {...props} />;
}

function AdminSelect({ className, ...props }: ComponentProps<typeof Select>) {
  return <Select className={cn("rounded-xl", className)} {...props} />;
}
