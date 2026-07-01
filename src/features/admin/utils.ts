import type { ManagedCourse } from "@/types/admin";

export function formatCurrencyFromKobo(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format((value || 0) / 100);
}

export function formatCurrencyFromNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRelativeTime(value?: string) {
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

export function getInitials(value: string) {
  const parts = String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length > 0) {
    return parts.map((part) => part[0]?.toUpperCase() || "").join("");
  }

  return "DW";
}

export function cloneCourseDraft(course: ManagedCourse | null) {
  return course ? { ...course, deliverables: [...course.deliverables] } : null;
}

export function sourceCourseSlug(currentSlug: string, sourceCourses: ManagedCourse[]) {
  if (currentSlug && sourceCourses.some((course) => course.slug === currentSlug)) {
    return currentSlug;
  }

  return sourceCourses[0]?.slug || "";
}

export function statusTone(status: string) {
  if (status === "success") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "failed") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
}
