import type { AdminRange } from "@/lib/admin-api";

export const adminRanges: Array<{ label: string; value: AdminRange }> = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "All Time", value: "all" },
];

export const adminEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
