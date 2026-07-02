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

async function adminFetch<T>(user: User, path: string, init?: RequestInit, options?: { background?: boolean }): Promise<T> {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.background ? { "X-Admin-Background-Refresh": "1" } : {}),
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

export async function getAdminDashboard(user: User, range: AdminRange, options?: { background?: boolean }) {
  const payload = await adminFetch<{ mode: "test" | "live"; range: AdminRange; metrics: AdminDashboardMetrics }>(
    user,
    `/api/admin/dashboard?range=${range}`,
    undefined,
    options,
  );

  return payload;
}

export async function getAdminCourses(user: User, options?: { background?: boolean }) {
  const payload = await adminFetch<{ courses: ManagedCourse[] }>(user, "/api/admin/courses", undefined, options);
  return payload.courses;
}

export async function updateAdminCourse(user: User, slug: string, updates: Partial<ManagedCourse>) {
  const payload = await adminFetch<{ course: ManagedCourse }>(user, `/api/admin/courses/${slug}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });

  return payload.course;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

export async function uploadAdminCourseAsset(user: User, slug: string, file: File) {
  const dataUri = await readFileAsDataUrl(file);
  const payload = await adminFetch<{ course: ManagedCourse }>(user, `/api/admin/courses/${slug}/asset`, {
    method: "POST",
    body: JSON.stringify({
      dataUri,
      fileName: file.name,
    }),
  });

  return payload.course;
}

export async function deleteAdminCourseAsset(user: User, slug: string) {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl(`/api/admin/courses/${slug}/asset`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to remove the course file.");
  }

  const payload = await response.json();
  return payload.course as ManagedCourse;
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

export async function getAdminTransactions(user: User, range: AdminRange, options?: { background?: boolean }) {
  const payload = await adminFetch<{ transactions: AdminTransaction[] }>(user, `/api/admin/transactions?range=${range}`, undefined, options);
  return payload.transactions;
}

export async function getAdminCustomers(user: User, range: AdminRange, options?: { background?: boolean }) {
  const payload = await adminFetch<{ customers: AdminCustomer[] }>(user, `/api/admin/customers?range=${range}`, undefined, options);
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

export async function getAdminLogs(user: User, options?: { background?: boolean }) {
  return adminFetch<{ auditLogs: AuditLogItem[]; loginLogs: LoginLogItem[]; pendingAuditLogCount: number }>(user, "/api/admin/audit-logs", undefined, options);
}

export async function syncAdminAuditLogs(user: User) {
  return adminFetch<{ syncedCount: number; pendingAuditLogCount: number }>(user, "/api/admin/audit-logs/sync", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function loadAdminNotifications(user: User) {
  return adminFetch<{ notifications: AdminNotification[]; unreadCount: number }>(user, "/api/admin/notifications/load", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getAdminUsers(user: User, options?: { background?: boolean }) {
  const payload = await adminFetch<{ users: AdminDirectoryUser[] }>(user, "/api/admin/users", undefined, options);
  return payload.users;
}

export async function getAdminNotifications(user: User, options?: { background?: boolean }) {
  const payload = await adminFetch<{ notifications: AdminNotification[]; unreadCount: number }>(
    user,
    "/api/admin/notifications",
    undefined,
    options,
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

export async function deleteAdminUser(user: User, email: string) {
  const token = await user.getIdToken();
  const response = await fetch(apiUrl(`/api/admin/users/${encodeURIComponent(email)}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to delete this admin.");
  }
}

export type { AdminRange };
