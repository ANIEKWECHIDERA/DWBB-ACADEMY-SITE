import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { BookCopy, ClipboardList, CreditCard, LayoutGrid, ShieldCheck, Users } from "lucide-react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { adminEmailPattern } from "@/features/admin/constants";
import type { AdminNavSection, AdminSection } from "@/features/admin/types";
import { cloneCourseDraft, sourceCourseSlug } from "@/features/admin/utils";
import {
  deleteAdminCourse,
  deleteAdminCustomers,
  deleteAdminTransactions,
  dismissAdminNotification,
  getAdminCourses,
  getAdminCustomers,
  getAdminDashboard,
  getAdminLogs,
  getAdminSession,
  getAdminTransactions,
  getAdminUsers,
  loadAdminNotifications,
  markAdminNotification,
  markAllAdminNotificationsRead,
  reorderAdminCourses,
  syncAdminAuditLogs,
  updateAdminCourse,
  updateAdminUser,
  type AdminRange,
} from "@/lib/admin-api";
import { firebaseAuth, firebaseEnabled, firebaseInitError, googleProvider } from "@/lib/firebase";
import { getCheckoutPricing } from "@/lib/paystackPricing";
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

function getRangeStart(range: AdminRange) {
  const now = new Date();
  const start = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === "7d") {
    start.setDate(start.getDate() - 7);
    return start;
  }

  if (range === "30d") {
    start.setDate(start.getDate() - 30);
    return start;
  }

  return null;
}

function isDateWithinRange(value: string | undefined, range: AdminRange) {
  if (!value || range === "all") {
    return true;
  }

  const rangeStart = getRangeStart(range);
  if (!rangeStart) {
    return true;
  }

  const targetDate = new Date(value);
  if (Number.isNaN(targetDate.getTime())) {
    return false;
  }

  return targetDate >= rangeStart;
}

export function useAdminConsole() {
  const { pushToast } = useToast();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(() => firebaseEnabled && Boolean(firebaseAuth));
  const [authorizationError, setAuthorizationError] = useState(() =>
    !firebaseEnabled || !firebaseAuth ? firebaseInitError || "Firebase authentication is not configured for this environment." : "",
  );

  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [overviewRange, setOverviewRange] = useState<AdminRange>("30d");
  const [transactionsRange, setTransactionsRange] = useState<AdminRange>("30d");
  const [logsRange, setLogsRange] = useState<AdminRange>("30d");
  const [logsUserFilter, setLogsUserFilter] = useState("all");
  const [loadingData, setLoadingData] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [mutationLabel, setMutationLabel] = useState("Applying changes...");

  const [dashboard, setDashboard] = useState<AdminDashboardMetrics | null>(null);
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [selectedCourseSlug, setSelectedCourseSlug] = useState("");
  const [courseDraft, setCourseDraft] = useState<ManagedCourse | null>(null);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLogItem[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [pendingAuditLogCount, setPendingAuditLogCount] = useState(0);
  const [adminUsers, setAdminUsers] = useState<AdminDirectoryUser[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "super_admin">("admin");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const selectedCourseSlugRef = useRef(selectedCourseSlug);

  useEffect(() => {
    selectedCourseSlugRef.current = selectedCourseSlug;
  }, [selectedCourseSlug]);

  useEffect(() => {
    if (!firebaseEnabled || !firebaseAuth) {
      return;
    }

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
    if (!mobileSidebarOpen) {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    if (!mediaQuery.matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen]);

  const loadAdminData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!firebaseUser || !session) {
      return;
    }

    if (!silent) {
      setLoadingData(true);
    }

    try {
      const [dashboardResult, courseResult] = await Promise.all([
        getAdminDashboard(firebaseUser, overviewRange, { background: silent }),
        getAdminCourses(firebaseUser, { background: silent }),
      ]);

      const nextSlug = sourceCourseSlug(selectedCourseSlugRef.current, courseResult);

      setDashboard(dashboardResult.metrics);
      setCourses(courseResult);
      setSelectedCourseSlug(nextSlug);
      setCourseDraft(cloneCourseDraft(courseResult.find((course) => course.slug === nextSlug) || null));

      if (session.permissions.canViewTransactions || session.permissions.canViewCustomers) {
        const [transactionResult, customerResult] = await Promise.all([
          session.permissions.canViewTransactions ? getAdminTransactions(firebaseUser, transactionsRange, { background: silent }) : Promise.resolve([]),
          session.permissions.canViewCustomers ? getAdminCustomers(firebaseUser, "all", { background: silent }) : Promise.resolve([]),
        ]);

        setTransactions(transactionResult);
        setCustomers(customerResult);
        setSelectedTransactions([]);
        setSelectedCustomers([]);
      }

      if (session.permissions.canViewAuditLogs) {
        setAuditLogs([]);
        setLoginLogs([]);
        setLogsLoaded(false);
        setPendingAuditLogCount(0);
      }

      if (session.permissions.canManageAdmins) {
        const users = await getAdminUsers(firebaseUser, { background: silent });
        setAdminUsers(users);
      }

      setNotifications([]);
      setNotificationsLoaded(false);
    } catch (error) {
      if (!silent) {
        pushToast({
          title: "Admin data unavailable",
          description: error instanceof Error ? error.message : "Unable to load the admin console data.",
        });
      }
    } finally {
      if (!silent) {
        setLoadingData(false);
      }
    }
  }, [firebaseUser, overviewRange, pushToast, session, transactionsRange]);

  const loadNotificationsOnce = useCallback(async () => {
    if (!firebaseUser || notificationsLoaded) {
      return;
    }

    try {
      const payload = await loadAdminNotifications(firebaseUser);
      setNotifications(payload.notifications);
      setNotificationsLoaded(true);
    } catch (error) {
      pushToast({
        title: "Notifications unavailable",
        description: error instanceof Error ? error.message : "Unable to load notifications right now.",
      });
    }
  }, [firebaseUser, notificationsLoaded, pushToast]);

  const loadLogsOnce = useCallback(async () => {
    if (!firebaseUser || !session?.permissions.canViewAuditLogs || logsLoaded) {
      return;
    }

    try {
      const logsResult = await getAdminLogs(firebaseUser);
      setAuditLogs(logsResult.auditLogs);
      setLoginLogs(logsResult.loginLogs);
      setPendingAuditLogCount(logsResult.pendingAuditLogCount || 0);
      setLogsLoaded(true);
    } catch (error) {
      pushToast({
        title: "Audit logs unavailable",
        description: error instanceof Error ? error.message : "Unable to load audit logs right now.",
      });
    }
  }, [firebaseUser, logsLoaded, pushToast, session?.permissions.canViewAuditLogs]);

  useEffect(() => {
    if (!firebaseUser || !session) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadAdminData({ silent: false });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [firebaseUser, loadAdminData, overviewRange, session, transactionsRange]);

  useEffect(() => {
    if (activeSection === "notifications") {
      void loadNotificationsOnce();
    }

    if (activeSection === "logs") {
      void loadLogsOnce();
    }
  }, [activeSection, loadLogsOnce, loadNotificationsOnce]);

  const visibleSections = useMemo(() => {
    if (!session) return [];

    return [
      { id: "overview", label: "Overview", icon: LayoutGrid, visible: true },
      { id: "courses", label: "Courses", icon: BookCopy, visible: session.permissions.canManageCourses },
      { id: "transactions", label: "Transactions", icon: CreditCard, visible: session.permissions.canViewTransactions },
      { id: "customers", label: "Customers", icon: Users, visible: session.permissions.canViewCustomers },
      { id: "logs", label: "Audit Logs", icon: ClipboardList, visible: session.permissions.canViewAuditLogs },
      { id: "admins", label: "Admins", icon: ShieldCheck, visible: session.permissions.canManageAdmins },
    ].filter((item) => item.visible) as AdminNavSection[];
  }, [session]);

  const pricingPreview = courseDraft ? getCheckoutPricing(courseDraft.priceNaira) : null;
  const inviteEmailValid = adminEmailPattern.test(inviteEmail.trim());
  const mainSections = visibleSections.filter((section) => section.id === "overview" || section.id === "courses");
  const commerceSections = visibleSections.filter((section) => section.id === "transactions" || section.id === "customers");
  const governanceSections = visibleSections.filter((section) => section.id === "logs" || section.id === "admins");
  const unreadNotifications = notifications.filter((item) => !item.readAt).length;
  const logUserOptions = useMemo(() => {
    const uniqueEmails = new Set<string>();

    adminUsers.forEach((user) => {
      if (user.email) uniqueEmails.add(user.email);
    });
    auditLogs.forEach((item) => {
      if (item.actorEmail) uniqueEmails.add(item.actorEmail);
    });
    loginLogs.forEach((item) => {
      if (item.email) uniqueEmails.add(item.email);
    });

    return [
      { label: "All users", value: "all" },
      ...Array.from(uniqueEmails)
        .sort((a, b) => a.localeCompare(b))
        .map((email) => ({ label: email, value: email })),
    ];
  }, [adminUsers, auditLogs, loginLogs]);

  const filteredAuditLogs = useMemo(
    () =>
      auditLogs.filter((item) => {
        if (!isDateWithinRange(item.createdAt, logsRange)) {
          return false;
        }

        if (logsUserFilter !== "all" && item.actorEmail !== logsUserFilter) {
          return false;
        }

        return true;
      }),
    [auditLogs, logsRange, logsUserFilter],
  );

  const filteredLoginLogs = useMemo(
    () =>
      loginLogs.filter((item) => {
        if (!isDateWithinRange(item.createdAt, logsRange)) {
          return false;
        }

        if (logsUserFilter !== "all" && item.email !== logsUserFilter) {
          return false;
        }

        return true;
      }),
    [loginLogs, logsRange, logsUserFilter],
  );

  function selectCourse(slug: string, sourceCourses = courses) {
    setSelectedCourseSlug(slug);
    const selected = sourceCourses.find((course) => course.slug === slug) || null;
    setCourseDraft(cloneCourseDraft(selected));
  }

  function handleSetActiveSection(section: AdminSection) {
    setActiveSection(section);
    setMobileSidebarOpen(false);
  }

  async function runBusyAction<T>(label: string, action: () => Promise<T>) {
    setMutating(true);
    setMutationLabel(label);

    try {
      return await action();
    } finally {
      setMutating(false);
      setMutationLabel("Applying changes...");
    }
  }

  async function handleGoogleSignIn() {
    if (!firebaseEnabled || !firebaseAuth) {
      pushToast({
        title: "Firebase unavailable",
        description: firebaseInitError || "Firebase authentication is not configured for this environment.",
      });
      return;
    }

    try {
      await signInWithPopup(firebaseAuth, googleProvider || new GoogleAuthProvider());
    } catch (error) {
      pushToast({
        title: "Sign-in failed",
        description: error instanceof Error ? error.message : "Unable to continue with Google sign-in.",
      });
    }
  }

  async function handleSaveCourse() {
    if (!firebaseUser || !courseDraft) return false;

    try {
      await runBusyAction("Saving course...", async () => {
        const course = await updateAdminCourse(firebaseUser, selectedCourseSlug, {
          ...courseDraft,
          deliverables: courseDraft.deliverables.filter(Boolean),
        });
        const nextCourses = courses.map((item) => (item.slug === selectedCourseSlug ? course : item));
        setCourses(nextCourses);
        selectCourse(course.slug, nextCourses);
        pushToast({ title: "Course saved", description: `${course.title} was updated successfully.` });
      });
      return true;
    } catch (error) {
      pushToast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save the course right now.",
      });
      return false;
    }
  }

  async function handleDeleteCourse() {
    if (!firebaseUser || !courseDraft) return;

    try {
      await runBusyAction("Deleting course...", async () => {
        await deleteAdminCourse(firebaseUser, courseDraft.slug);
        const nextCourses = courses.filter((course) => course.slug !== courseDraft.slug);
        setCourses(nextCourses);
        selectCourse(nextCourses[0]?.slug || "", nextCourses);
        pushToast({ title: "Course deleted", description: `${courseDraft.title} was removed from the managed catalog.` });
      });
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

    const oldIndex = courses.findIndex((course) => course.slug === String(active.id));
    const newIndex = courses.findIndex((course) => course.slug === String(over.id));
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
      await runBusyAction("Saving admin access...", async () => {
        const user = await updateAdminUser(firebaseUser, inviteEmail, inviteRole, true);
        setAdminUsers((current) => {
          const filtered = current.filter((item) => item.email !== user.email);
          return [...filtered, user].sort((a, b) => a.email.localeCompare(b.email));
        });
        setInviteEmail("");
        setInviteRole("admin");
        pushToast({ title: "Admin access updated", description: `${user.email} can now sign in as ${user.role.replace("_", " ")}.` });
      });
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

    try {
      await runBusyAction("Deleting transactions...", async () => {
        await deleteAdminTransactions(firebaseUser, references);
        setTransactions((current) => current.filter((item) => !references.includes(item.reference)));
        setSelectedTransactions((current) => current.filter((item) => !references.includes(item)));
        pushToast({ title: "Transactions deleted", description: `${references.length} transaction record(s) removed.` });
      });
    } catch (error) {
      pushToast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete the selected transactions.",
      });
    }
  }

  async function handleDeleteCustomers(emails: string[]) {
    if (!firebaseUser || emails.length === 0) return;

    try {
      await runBusyAction("Deleting customers...", async () => {
        await deleteAdminCustomers(firebaseUser, emails);
        setCustomers((current) => current.filter((item) => !emails.includes(item.email)));
        setSelectedCustomers((current) => current.filter((item) => !emails.includes(item)));
        pushToast({ title: "Customers deleted", description: `${emails.length} customer record(s) removed.` });
      });
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
      await runBusyAction("Updating notification...", async () => {
        const payload = await markAdminNotification(firebaseUser, notificationId, status);
        const nextNotification = payload.notification;
        setNotifications((current) => current.map((item) => (item.id === notificationId && nextNotification ? nextNotification : item)));
      });
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
      await runBusyAction("Dismissing notification...", async () => {
        await dismissAdminNotification(firebaseUser, notificationId);
        setNotifications((current) => current.filter((item) => item.id !== notificationId));
      });
    } catch (error) {
      pushToast({
        title: "Dismiss failed",
        description: error instanceof Error ? error.message : "Unable to dismiss this notification right now.",
      });
    }
  }

  async function handleMarkAllNotificationsRead() {
    if (!firebaseUser) return;

    if (!notificationsLoaded) {
      await loadNotificationsOnce();
    }

    if (unreadNotifications === 0) return;

    try {
      await runBusyAction("Marking notifications as read...", async () => {
        await markAllAdminNotificationsRead(firebaseUser);
        setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      });
    } catch (error) {
      pushToast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to mark all notifications as read.",
      });
    }
  }

  async function handleSyncAuditLogs() {
    if (!firebaseUser) {
      return;
    }

    try {
      await runBusyAction("Syncing audit logs...", async () => {
        const payload = await syncAdminAuditLogs(firebaseUser);
        setPendingAuditLogCount(payload.pendingAuditLogCount || 0);
        setLogsLoaded(false);
        const logsResult = await getAdminLogs(firebaseUser);
        setAuditLogs(logsResult.auditLogs);
        setLoginLogs(logsResult.loginLogs);
        setPendingAuditLogCount(logsResult.pendingAuditLogCount || 0);
        setLogsLoaded(true);
        pushToast({
          title: "Audit logs synced",
          description: `${payload.syncedCount} queued audit log${payload.syncedCount === 1 ? "" : "s"} pushed to Firestore.`,
        });
      });
    } catch (error) {
      pushToast({
        title: "Audit sync failed",
        description: error instanceof Error ? error.message : "Unable to sync audit logs right now.",
      });
    }
  }

  async function handleLogout() {
    if (!firebaseAuth) {
      return;
    }

    await signOut(firebaseAuth);
  }

  return {
    firebaseUser,
    session,
    loadingSession,
    authorizationError,
    activeSection,
    setActiveSection: handleSetActiveSection,
    overviewRange,
    setOverviewRange,
    transactionsRange,
    setTransactionsRange,
    logsRange,
    setLogsRange,
    logsUserFilter,
    setLogsUserFilter,
    logUserOptions,
    loadingData,
    mutating,
    mutationLabel,
    isPageBusy: loadingData || mutating,
    dashboard,
    courses,
    selectedCourseSlug,
    courseDraft,
    setCourseDraft,
    transactions,
    selectedTransactions,
    setSelectedTransactions,
    customers,
    selectedCustomers,
    setSelectedCustomers,
    notifications,
    auditLogs: filteredAuditLogs,
    loginLogs: filteredLoginLogs,
    adminUsers,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    sidebarOpen,
    setSidebarOpen,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    visibleSections,
    mainSections,
    commerceSections,
    governanceSections,
    pricingPreview,
    inviteEmailValid,
    unreadNotifications,
    notificationsLoaded,
    logsLoaded,
    pendingAuditLogCount,
    toggleSelection,
    selectCourse,
    loadNotificationsOnce,
    handleSyncAuditLogs,
    handleGoogleSignIn,
    handleSaveCourse,
    handleDeleteCourse,
    handleCourseDragEnd,
    handleInviteAdmin,
    handleDeleteTransactions,
    handleDeleteCustomers,
    handleNotificationStatus,
    handleDismissNotification,
    handleMarkAllNotificationsRead,
    handleLogout,
  };
}
