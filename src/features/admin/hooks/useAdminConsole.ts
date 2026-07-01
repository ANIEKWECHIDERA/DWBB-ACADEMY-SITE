import type { DragEndEvent } from "@dnd-kit/core";
import { BookCopy, ClipboardList, CreditCard, LayoutGrid, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { arrayMove } from "@dnd-kit/sortable";

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
import { firebaseAuth, firebaseEnabled, firebaseInitError, googleProvider } from "@/lib/firebase";
import { getCheckoutPricing } from "@/lib/paystackPricing";
import { useToast } from "@/components/ui/toast";
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

export function useAdminConsole() {
  const { pushToast } = useToast();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(() => firebaseEnabled && Boolean(firebaseAuth));
  const [authorizationError, setAuthorizationError] = useState(() =>
    !firebaseEnabled || !firebaseAuth ? firebaseInitError || "Firebase authentication is not configured for this environment." : "",
  );

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
    if (!firebaseUser || !session) {
      return;
    }

    const currentUser = firebaseUser;
    const currentSession = session;
    let active = true;

    async function load() {
      setLoadingData(true);

      try {
        const [dashboardResult, courseResult] = await Promise.all([
          getAdminDashboard(currentUser, range),
          getAdminCourses(currentUser),
        ]);

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
      { id: "transactions", label: "Transactions", icon: CreditCard, visible: session.permissions.canViewTransactions },
      { id: "customers", label: "Customers", icon: Users, visible: session.permissions.canViewCustomers },
      { id: "logs", label: "Audit Logs", icon: ClipboardList, visible: session.permissions.canViewAuditLogs },
      { id: "admins", label: "Admins", icon: ShieldCheck, visible: session.permissions.canManageAdmins },
    ].filter((item) => item.visible) as AdminNavSection[];
  }, [session]);

  const pricingPreview = courseDraft ? getCheckoutPricing(courseDraft.priceNaira) : null;
  const shouldShowRangeFilter = activeSection === "overview" || activeSection === "transactions" || activeSection === "logs";
  const inviteEmailValid = adminEmailPattern.test(inviteEmail.trim());
  const mainSections = visibleSections.filter((section) => section.id === "overview" || section.id === "courses");
  const commerceSections = visibleSections.filter((section) => section.id === "transactions" || section.id === "customers");
  const governanceSections = visibleSections.filter((section) => section.id === "logs" || section.id === "admins");
  const unreadNotifications = notifications.filter((item) => !item.readAt).length;

  function selectCourse(slug: string, sourceCourses = courses) {
    setSelectedCourseSlug(slug);
    const selected = sourceCourses.find((course) => course.slug === slug) || null;
    setCourseDraft(cloneCourseDraft(selected));
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
      setNotifications((current) => current.map((item) => (item.id === notificationId && nextNotification ? nextNotification : item)));
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
    setActiveSection,
    range,
    setRange,
    loadingData,
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
    auditLogs,
    loginLogs,
    adminUsers,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    sidebarOpen,
    setSidebarOpen,
    visibleSections,
    mainSections,
    commerceSections,
    governanceSections,
    pricingPreview,
    shouldShowRangeFilter,
    inviteEmailValid,
    unreadNotifications,
    toggleSelection,
    selectCourse,
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
