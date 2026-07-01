import type { LucideIcon } from "lucide-react";

export type AdminSection = "overview" | "courses" | "notifications" | "transactions" | "customers" | "logs" | "admins";

export interface AdminNavSection {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
}
