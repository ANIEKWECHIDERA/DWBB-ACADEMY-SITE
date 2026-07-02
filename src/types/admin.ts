export type AdminRole = "admin" | "super_admin";

export interface AdminSessionUser {
  uid: string;
  email: string;
  role: AdminRole;
  active: boolean;
  protected?: boolean;
}

export interface AdminPermissions {
  canManageCourses: boolean;
  canViewCustomers: boolean;
  canViewTransactions: boolean;
  canViewAuditLogs: boolean;
  canManageAdmins: boolean;
}

export interface AdminSession {
  user: AdminSessionUser;
  permissions: AdminPermissions;
  mode: "test" | "live";
  firebaseEnabled: boolean;
}

export interface AdminDashboardMetrics {
  grossSalesKobo: number;
  netInflowKobo: number;
  totalTransactions: number;
  topSellingCourse: {
    courseTitle: string;
    transactions: number;
    grossSalesKobo: number;
    netInflowKobo: number;
  } | null;
  salesByCourse: Array<{
    courseTitle: string;
    transactions: number;
    grossSalesKobo: number;
    netInflowKobo: number;
  }>;
  inflowOverTime: Array<{
    date: string;
    grossSalesKobo: number;
    netInflowKobo: number;
    transactions: number;
  }>;
}

export interface ManagedCourse {
  id: string;
  slug: string;
  title: string;
  shortTitle?: string;
  summary: string;
  longDescription: string;
  deliverables: string[];
  priceNaira: number;
  checkoutPriceNaira: number;
  processingFeeNaira: number;
  published: boolean;
  featured: boolean;
  order: number;
  assets?: Array<{
    publicId?: string;
    url?: string;
    fileName?: string;
    originalFilename?: string;
    format?: string;
    bytes?: number | null;
    resourceType?: string;
  }>;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AdminTransaction {
  id: string;
  reference: string;
  courseTitle: string;
  courseSlug: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amountKobo?: number;
  chargedAmountKobo: number;
  coursePriceKobo: number;
  processingFeeKobo: number;
  paymentChannel?: string;
  paymentMethod?: string;
  status: string;
  paidAt: string;
}

export interface AdminCustomer {
  email: string;
  name: string;
  phone?: string;
  totalGrossKobo: number;
  totalNetKobo: number;
  totalTransactions: number;
  lastPurchaseAt: string;
  courses: string[];
}

export interface AuditLogItem {
  id: string;
  actorEmail?: string;
  actorRole?: AdminRole;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LoginLogItem {
  id: string;
  email: string;
  role: AdminRole;
  uid: string;
  createdAt: string;
}

export interface AdminDirectoryUser {
  id: string;
  email: string;
  role: AdminRole;
  active: boolean;
  protected?: boolean;
  invitedBy?: string;
  updatedAt?: string;
}

export interface AdminNotification {
  id: string;
  kind: "purchase";
  title: string;
  message: string;
  courseSlug?: string;
  courseTitle?: string;
  customerName?: string;
  customerEmail?: string;
  transactionReference?: string;
  amountKobo?: number;
  createdAt: string;
  readAt?: string | null;
}
