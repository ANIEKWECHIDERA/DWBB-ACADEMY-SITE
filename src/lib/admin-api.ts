import type { User } from "firebase/auth";

import { apiUrl } from "@/lib/api";
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

type AdminRange = "today" | "7d" | "30d" | "all";

async function adminFetch<T>(user: User, path: string, init?: RequestInit): Promise<T> {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Admin request failed.");
  }

  return response.json();
}

export function getAdminSession(user: User) {
  return adminFetch<AdminSession>(user, "/api/admin/session");
}

export async function getAdminDashboard(user: User, range: AdminRange) {
  const payload = await adminFetch<{ mode: "test" | "live"; range: AdminRange; metrics: AdminDashboardMetrics }>(
    user,
    `/api/admin/dashboard?range=${range}`,
  );

  return payload;
}

export async function getAdminCourses(user: User) {
  const payload = await adminFetch<{ courses: ManagedCourse[] }>(user, "/api/admin/courses");
  return payload.courses;
}

export async function updateAdminCourse(user: User, slug: string, updates: Partial<ManagedCourse>) {
  const payload = await adminFetch<{ course: ManagedCourse }>(user, `/api/admin/courses/${slug}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });

  return payload.course;
}

export async function reorderAdminCourses(user: User, slugs: string[]) {
  const payload = await adminFetch<{ courses: ManagedCourse[] }>(user, "/api/admin/courses/reorder", {
    method: "POST",
    body: JSON.stringify({ slugs }),
  });

  return payload.courses;
}

export async function deleteAdminCourse(user: User, slug: string) {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl(`/api/admin/courses/${slug}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to delete course.");
  }
}

export async function getAdminTransactions(user: User, range: AdminRange) {
  const payload = await adminFetch<{ transactions: AdminTransaction[] }>(user, `/api/admin/transactions?range=${range}`);
  return payload.transactions;
}

export async function getAdminCustomers(user: User, range: AdminRange) {
  const payload = await adminFetch<{ customers: AdminCustomer[] }>(user, `/api/admin/customers?range=${range}`);
  return payload.customers;
}

export async function deleteAdminTransactions(user: User, references: string[]) {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl("/api/admin/transactions"), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ references }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to delete the selected transactions.");
  }
}

export async function deleteAdminCustomers(user: User, emails: string[]) {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl("/api/admin/customers"), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ emails }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to delete the selected customers.");
  }
}

export async function getAdminLogs(user: User) {
  return adminFetch<{ auditLogs: AuditLogItem[]; loginLogs: LoginLogItem[] }>(user, "/api/admin/audit-logs");
}

export async function getAdminUsers(user: User) {
  const payload = await adminFetch<{ users: AdminDirectoryUser[] }>(user, "/api/admin/users");
  return payload.users;
}

export async function getAdminNotifications(user: User) {
  const payload = await adminFetch<{ notifications: AdminNotification[]; unreadCount: number }>(
    user,
    "/api/admin/notifications",
  );
  return payload;
}

export async function markAdminNotification(user: User, notificationId: string, status: "read" | "unread") {
  return adminFetch<{ notification: AdminNotification | null }>(user, `/api/admin/notifications/${notificationId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function dismissAdminNotification(user: User, notificationId: string) {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl(`/api/admin/notifications/${notificationId}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to dismiss notification.");
  }
}

export async function markAllAdminNotificationsRead(user: User) {
  return adminFetch<{ updatedCount: number }>(user, "/api/admin/notifications/mark-all-read", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function updateAdminUser(user: User, email: string, role: "admin" | "super_admin", active = true) {
  const payload = await adminFetch<{ user: AdminDirectoryUser }>(user, `/api/admin/users/${encodeURIComponent(email)}`, {
    method: "PUT",
    body: JSON.stringify({ role, active }),
  });

  return payload.user;
}

export type { AdminRange };
