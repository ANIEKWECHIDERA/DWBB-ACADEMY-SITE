import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";

import {
  clearManagedCourseAssets,
  deleteAdminUserByEmail,
  deleteManagedCourse,
  dismissNotification,
  deleteCustomersByEmail,
  deleteTransactionsByReference,
  ensureManagedCoursesSeeded,
  getAdminUserByEmail,
  getDashboardMetrics,
  getManagedCourse,
  listAdminUsers,
  listAuditLogs,
  listCustomers,
  listLoginLogs,
  listManagedCourses,
  listNotifications,
  listTransactions,
  markAllNotificationsRead,
  mirrorVerifiedPurchase,
  normalizeEmail,
  recordAdminLogin,
  recordAuditLogsBatch,
  reorderManagedCourses,
  replaceManagedCourseAsset,
  updateNotificationStatus,
  updateManagedCourse,
  upsertAdminUser,
} from "./admin-store.mjs";
import { digitalCourseCatalog, findDigitalCourse } from "./course-catalog.mjs";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore, isFirebaseAdminConfigured } from "./firebase-admin.mjs";
import { childLogger, logger } from "./logger.mjs";
import { getCheckoutPricing } from "../src/lib/paystackPricing.js";

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || process.env.SERVER_PORT || 8787);
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
const publicApiBaseUrl = process.env.PUBLIC_API_BASE_URL || process.env.SERVER_PUBLIC_URL || "";
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY;
const enablePaymentDebug = String(process.env.ENABLE_PAYMENT_DEBUG || "false") === "true";
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
const downloadLinkTtlDays = Number(process.env.DOWNLOAD_LINK_TTL_DAYS || 7);
const trustProxy = process.env.TRUST_PROXY;
const configuredDataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), "server/.data");
const fallbackDataDir = path.join(os.tmpdir(), "dwbb-academy-data");
let dataDir = configuredDataDir;
let purchasesFile = path.join(dataDir, "purchases.json");
let attemptsFile = path.join(dataDir, "payment-attempts.json");
let webhookEventsFile = path.join(dataDir, "webhook-events.json");
const rateLimitStores = new Map();
const pendingJsonWrites = new Map();
const adminUserCache = new Map();
const adminActivityCache = new Map();
const pendingAuditLogs = [];
let warnedAboutFallbackDataDir = false;
const PURCHASE_COLLECTION = "purchases";

const ADMIN_USER_CACHE_TTL_MS = 10 * 60 * 1000;
const ADMIN_LOGIN_DEDUP_TTL_MS = 6 * 60 * 60 * 1000;
const ADMIN_VIEW_AUDIT_DEDUP_TTL_MS = 2 * 60 * 1000;

if (trustProxy) {
  const trustProxyValue = Number(trustProxy);
  app.set("trust proxy", Number.isNaN(trustProxyValue) ? trustProxy : trustProxyValue);
}

app.disable("x-powered-by");
app.use(securityHeadersMiddleware);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: "12mb",
    verify: (req, _res, buffer) => {
      req.rawBody = buffer.toString();
    },
  }),
);
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  req.requestLogger = childLogger({
    requestId: req.requestId,
    method: req.method,
    path: req.path,
  });

  const startedAt = Date.now();
  req.requestLogger.debug("request.received", {
    query: req.query,
    ip: getClientIdentifier(req),
    userAgent: req.headers["user-agent"] || "",
  });

  res.on("finish", () => {
    req.requestLogger.info("request.completed", {
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      actorEmail: req.adminUser?.email || null,
      actorRole: req.adminUser?.role || null,
    });
  });

  next();
});

const initializeRateLimit = createRateLimiter({ key: "payments-initialize", max: 12, windowMs: 15 * 60 * 1000 });
const verifyRateLimit = createRateLimiter({ key: "payments-verify", max: 60, windowMs: 15 * 60 * 1000 });
const webhookRateLimit = createRateLimiter({ key: "payments-webhook", max: 120, windowMs: 15 * 60 * 1000 });
const downloadRateLimit = createRateLimiter({ key: "downloads", max: 120, windowMs: 15 * 60 * 1000 });

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/store/courses", async (_req, res) => {
  const managedCourses = await loadManagedCoursesForPublic();

  res.json({
    courses: managedCourses.map((course) => {
      const checkoutPricing = getCheckoutPricing(course.priceNaira);

      return {
        checkoutPrice: formatNaira(checkoutPricing.totalChargeNaira),
        checkoutPriceNaira: checkoutPricing.totalChargeNaira,
        processingFee: formatNaira(checkoutPricing.processingFeeNaira),
        processingFeeNaira: checkoutPricing.processingFeeNaira,
        templateSlug: course.templateSlug || course.slug,
        slug: course.slug,
        shortTitle: course.shortTitle || "",
        title: course.title,
        summary: course.summary || "",
        longDescription: course.longDescription || "",
        deliverables: course.deliverables || [],
        published: course.published !== false,
        featured: course.featured !== false,
        order: Number(course.order || 0),
        priceNaira: course.priceNaira,
        price: formatNaira(course.priceNaira),
      };
    }),
  });
});

app.get("/api/admin/session", requireAdminAuth(), async (req, res) => {
  const { adminUser } = req;

  if (isFirebaseAdminConfigured()) {
    await ensureManagedCoursesSeeded();
  }

  await recordAdminLoginSafe(adminUser);
  req.requestLogger?.info("admin.session.loaded", {
    actorEmail: adminUser.email,
    actorRole: adminUser.role,
  });

  res.json({
    user: adminUser,
    permissions: {
      canManageCourses: true,
      canViewCustomers: adminUser.role === "super_admin",
      canViewTransactions: adminUser.role === "super_admin",
      canViewAuditLogs: adminUser.role === "super_admin",
      canManageAdmins: adminUser.role === "super_admin",
    },
    mode: getPaystackMode(),
    firebaseEnabled: isFirebaseAdminConfigured(),
  });
});

app.get("/api/admin/dashboard", requireAdminAuth(), async (req, res) => {
  const range = parseDashboardRange(req.query.range);
  const metrics = await getDashboardMetrics(range);
  if (!shouldSkipAdminAuditLog(req)) {
    await recordAuditLogSafe({
      actorEmail: req.adminUser.email,
      actorRole: req.adminUser.role,
      action: "dashboard.viewed",
      entityType: "dashboard",
      entityId: "overview",
      metadata: { range },
    });
  }
  res.json({
    mode: getPaystackMode(),
    range,
    metrics,
  });
});

app.get("/api/admin/courses", requireAdminAuth(), async (_req, res) => {
  const courses = await listManagedCoursesSafe();
  res.json({ courses });
});

app.put("/api/admin/courses/:slug", requireAdminAuth(), async (req, res) => {
  const slug = req.params.slug;
  const updates = sanitizeCourseUpdates(req.body ?? {});
  const course = await updateManagedCourse(slug, updates, req.adminUser);

  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: "course.updated",
    entityType: "course",
    entityId: slug,
    metadata: { fields: Object.keys(updates) },
  });

  res.json({ course });
});

app.post("/api/admin/courses/reorder", requireAdminAuth(), async (req, res) => {
  const slugs = Array.isArray(req.body?.slugs) ? req.body.slugs.filter(Boolean) : [];

  if (slugs.length === 0) {
    return res.status(400).json({ error: "Course order is required." });
  }

  const courses = await reorderManagedCourses(slugs, req.adminUser);
  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: "course.reordered",
    entityType: "course",
    entityId: "catalog",
    metadata: { slugs },
  });

  res.json({ courses });
});

app.delete("/api/admin/courses/:slug", requireAdminAuth(), async (req, res) => {
  const slug = req.params.slug;
  await deleteManagedCourse(slug);
  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: "course.deleted",
    entityType: "course",
    entityId: slug,
    metadata: {},
  });
  res.status(204).end();
});

app.post("/api/admin/courses/:slug/asset", requireAdminAuth(), async (req, res) => {
  const slug = req.params.slug;
  const dataUri = typeof req.body?.dataUri === "string" ? req.body.dataUri : "";
  const fileName = typeof req.body?.fileName === "string" ? req.body.fileName.trim() : "";

  if (!dataUri || !fileName) {
    return res.status(400).json({ error: "A valid file is required." });
  }

  try {
    const course = await replaceManagedCourseAsset(slug, {
      actor: req.adminUser,
      dataUri,
      fileName: sanitizeAssetFileName(fileName),
    });

    await recordAuditLogSafe({
      actorEmail: req.adminUser.email,
      actorRole: req.adminUser.role,
      action: "course.asset.replaced",
      entityType: "course",
      entityId: slug,
      metadata: { fileName },
    });

    res.json({ course });
  } catch (error) {
    logServerError("Course asset upload failed", error);
    res.status(500).json({ error: "Unable to upload course file right now." });
  }
});

app.delete("/api/admin/courses/:slug/asset", requireAdminAuth(), async (req, res) => {
  const slug = req.params.slug;

  try {
    const course = await clearManagedCourseAssets(slug, req.adminUser);
    await recordAuditLogSafe({
      actorEmail: req.adminUser.email,
      actorRole: req.adminUser.role,
      action: "course.asset.deleted",
      entityType: "course",
      entityId: slug,
      metadata: {},
    });
    res.json({ course });
  } catch (error) {
    logServerError("Course asset delete failed", error);
    res.status(500).json({ error: "Unable to remove course file right now." });
  }
});

app.get("/api/admin/transactions", requireAdminAuth({ superAdminOnly: true }), async (req, res) => {
  const range = parseDashboardRange(req.query.range);
  const transactions = await listTransactions(range);
  if (!shouldSkipAdminAuditLog(req)) {
    await recordAuditLogSafe({
      actorEmail: req.adminUser.email,
      actorRole: req.adminUser.role,
      action: "transactions.viewed",
      entityType: "transaction",
      entityId: "collection",
      metadata: { range },
    });
  }
  res.json({ transactions });
});

app.delete("/api/admin/transactions", requireAdminAuth({ superAdminOnly: true }), async (req, res) => {
  const references = Array.isArray(req.body?.references) ? req.body.references.filter(Boolean) : [];

  if (references.length === 0) {
    return res.status(400).json({ error: "At least one transaction reference is required." });
  }

  await deleteTransactionsByReference(references);
  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: "transactions.deleted",
    entityType: "transaction",
    entityId: "collection",
    metadata: { references },
  });
  res.status(204).end();
});

app.get("/api/admin/customers", requireAdminAuth({ superAdminOnly: true }), async (req, res) => {
  const range = parseDashboardRange(req.query.range);
  const customers = await listCustomers(range);
  if (!shouldSkipAdminAuditLog(req)) {
    await recordAuditLogSafe({
      actorEmail: req.adminUser.email,
      actorRole: req.adminUser.role,
      action: "customers.viewed",
      entityType: "customer",
      entityId: "collection",
      metadata: { range },
    });
  }
  res.json({ customers });
});

app.delete("/api/admin/customers", requireAdminAuth({ superAdminOnly: true }), async (req, res) => {
  const emails = Array.isArray(req.body?.emails) ? req.body.emails.filter(Boolean) : [];

  if (emails.length === 0) {
    return res.status(400).json({ error: "At least one customer email is required." });
  }

  await deleteCustomersByEmail(emails);
  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: "customers.deleted",
    entityType: "customer",
    entityId: "collection",
    metadata: { emails },
  });
  res.status(204).end();
});

app.get("/api/admin/notifications", requireAdminAuth(), async (req, res) => {
  const payload = await listNotificationsSafe();
  if (!shouldSkipAdminAuditLog(req)) {
    await recordAuditLogSafe({
      actorEmail: req.adminUser.email,
      actorRole: req.adminUser.role,
      action: "notifications.viewed",
      entityType: "notification",
      entityId: "collection",
      metadata: {},
    });
  }
  res.json(payload);
});

app.post("/api/admin/notifications/load", requireAdminAuth(), async (req, res) => {
  const payload = await listNotificationsSafe();
  req.requestLogger?.info("admin.notifications.loaded", {
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    unreadCount: payload.unreadCount,
  });
  res.json(payload);
});

app.patch("/api/admin/notifications/:id", requireAdminAuth(), async (req, res) => {
  const status = req.body?.status;

  if (status !== "read" && status !== "unread") {
    return res.status(400).json({ error: "A valid notification status is required." });
  }

  const notification = await updateNotificationStatus(req.params.id, status);
  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: `notification.${status}`,
    entityType: "notification",
    entityId: req.params.id,
    metadata: {},
  });
  res.json({ notification });
});

app.post("/api/admin/notifications/mark-all-read", requireAdminAuth(), async (req, res) => {
  const updatedCount = await markAllNotificationsRead();
  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: "notifications.mark_all_read",
    entityType: "notification",
    entityId: "collection",
    metadata: { updatedCount },
  });
  res.json({ updatedCount });
});

app.delete("/api/admin/notifications/:id", requireAdminAuth(), async (req, res) => {
  await dismissNotification(req.params.id);
  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: "notification.dismissed",
    entityType: "notification",
    entityId: req.params.id,
    metadata: {},
  });
  res.status(204).end();
});

app.get("/api/admin/audit-logs", requireAdminAuth({ superAdminOnly: true }), async (req, res) => {
  const [auditLogs, loginLogs] = await Promise.all([listAuditLogsSafe(), listLoginLogsSafe()]);
  if (!shouldSkipAdminAuditLog(req)) {
    await recordAuditLogSafe({
      actorEmail: req.adminUser.email,
      actorRole: req.adminUser.role,
      action: "audit_logs.viewed",
      entityType: "audit_log",
      entityId: "collection",
      metadata: {},
    });
  }
  res.json({
    auditLogs: mergeAuditLogsWithPending(auditLogs),
    loginLogs,
    pendingAuditLogCount: pendingAuditLogs.length,
  });
});

app.post("/api/admin/audit-logs/sync", requireAdminAuth({ superAdminOnly: true }), async (req, res) => {
  if (!isFirebaseAdminConfigured()) {
    return res.json({ syncedCount: 0, pendingAuditLogCount: pendingAuditLogs.length });
  }

  if (pendingAuditLogs.length === 0) {
    return res.json({ syncedCount: 0, pendingAuditLogCount: 0 });
  }

  const queueSnapshot = pendingAuditLogs.splice(0, pendingAuditLogs.length);

  try {
    const syncedCount = await recordAuditLogsBatch(queueSnapshot);
    req.requestLogger?.info("admin.audit_logs.synced", {
      actorEmail: req.adminUser.email,
      actorRole: req.adminUser.role,
      syncedCount,
      pendingAuditLogCount: pendingAuditLogs.length,
    });
    res.json({ syncedCount, pendingAuditLogCount: pendingAuditLogs.length });
  } catch (error) {
    pendingAuditLogs.unshift(...queueSnapshot);
    logServerError("Audit log sync failed", error);

    if (isFirestoreQuotaError(error)) {
      return res.status(503).json({
        error: "Firestore usage is temporarily exhausted. Try syncing audit logs again later.",
      });
    }

    res.status(500).json({ error: "Unable to sync audit logs right now." });
  }
});

app.get("/api/admin/users", requireAdminAuth({ superAdminOnly: true }), async (_req, res) => {
  const users = await listAdminUsersSafe();
  res.json({ users });
});

app.put("/api/admin/users/:email", requireAdminAuth({ superAdminOnly: true }), async (req, res) => {
  const email = normalizeEmail(req.params.email);
  const role = req.body?.role;

  if (role !== "admin" && role !== "super_admin") {
    return res.status(400).json({ error: "A valid role is required." });
  }

  if (!email) {
    return res.status(400).json({ error: "A valid admin email is required." });
  }

  if (email === normalizeEmail(req.adminUser.email)) {
    return res.status(400).json({ error: "You cannot change your own admin access from the console." });
  }

  if (isProtectedSuperAdminEmail(email)) {
    return res.status(400).json({ error: "Primary super admin access is protected and cannot be changed here." });
  }

  const user = await upsertAdminUser({
    email,
    role,
    invitedBy: req.adminUser.email,
    active: req.body?.active !== false,
  });
  clearCachedAdminUser(email);

  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: "admin.role.updated",
    entityType: "admin_user",
    entityId: normalizeEmail(email),
    metadata: { role, active: req.body?.active !== false },
  });

  res.json({ user });
});

app.delete("/api/admin/users/:email", requireAdminAuth({ superAdminOnly: true }), async (req, res) => {
  const email = normalizeEmail(req.params.email);

  if (!email) {
    return res.status(400).json({ error: "A valid admin email is required." });
  }

  if (email === normalizeEmail(req.adminUser.email)) {
    return res.status(400).json({ error: "You cannot delete your own admin access." });
  }

  if (getSuperAdminEmails().includes(email)) {
    return res.status(400).json({ error: "Primary super admin access cannot be deleted here." });
  }

  await deleteAdminUserByEmail(email);
  clearCachedAdminUser(email);

  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: "admin.deleted",
    entityType: "admin_user",
    entityId: email,
    metadata: {},
  });

  res.status(204).end();
});

app.post("/api/admin/client-events", requireAdminAuth(), async (req, res) => {
  const event = typeof req.body?.event === "string" ? req.body.event.trim() : "";
  const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};
  const allowedEvents = new Set([
    "admin.console.loaded",
    "admin.console.refreshed",
    "admin.logout.initiated",
    "admin.notifications.opened",
    "admin.section.changed",
  ]);

  if (!allowedEvents.has(event)) {
    return res.status(400).json({ error: "A valid client event is required." });
  }

  req.requestLogger?.info("admin.client_event", {
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    event,
    metadata,
  });

  res.json({ ok: true });
});

app.get("/api/payments/debug/attempts", requirePaymentDebug, async (_req, res) => {
  const attempts = await readJsonFile(attemptsFile);
  res.json({ attempts });
});

app.get("/api/payments/debug/webhooks", requirePaymentDebug, async (_req, res) => {
  const events = await readJsonFile(webhookEventsFile);
  res.json({ events });
});

app.post("/api/payments/initialize", initializeRateLimit, async (req, res) => {
  try {
    ensurePaystackConfigured();

    const { courseSlug, name, email, phone } = req.body ?? {};
    const course = await getCourseForCheckout(courseSlug);
    const publicAppBaseUrl = getPublicAppBaseUrl(req);
    const checkoutPricing = course ? getCheckoutPricing(course.priceNaira) : null;

    if (!course || !name || !email) {
      return res.status(400).json({ error: "Missing required payment details." });
    }

    const reference = `dwbb-${course.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const amount = checkoutPricing.totalChargeKobo;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount,
        currency: "NGN",
        reference,
        callback_url: `${publicAppBaseUrl}/payment/success`,
        metadata: {
          custom_fields: [
            { display_name: "Course", variable_name: "course", value: course.title },
            { display_name: "Customer Name", variable_name: "customer_name", value: name },
            { display_name: "Phone", variable_name: "phone", value: phone || "" },
          ],
          appBaseUrl: publicAppBaseUrl,
          publicApiBaseUrl: getPublicApiBaseUrl(req),
          chargedAmountKobo: checkoutPricing.totalChargeKobo,
          courseSlug: course.slug,
          customerName: name,
          customerPhone: phone || "",
          processingFeeKobo: checkoutPricing.processingFeeKobo,
          productType: "digital-course",
          targetAmountKobo: checkoutPricing.baseAmountKobo,
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok || !payload.status) {
      console.error("Paystack initialize failed:", payload);
      return res.status(502).json({
        error: "Unable to start checkout right now.",
      });
    }

    await recordPaymentAttempt({
      reference: payload.data.reference,
      accessCode: payload.data.access_code,
      courseSlug: course.slug,
      courseTitle: course.title,
      amount,
      processingFeeKobo: checkoutPricing.processingFeeKobo,
      targetAmountKobo: checkoutPricing.baseAmountKobo,
      email,
      appBaseUrl: publicAppBaseUrl,
      createdAt: new Date().toISOString(),
    });

    res.json({
      accessCode: payload.data.access_code,
      reference: payload.data.reference,
      amount,
      callbackUrl: `${publicAppBaseUrl}/payment/success`,
      processingFeeKobo: checkoutPricing.processingFeeKobo,
      publicKey: paystackPublicKey,
      targetAmountKobo: checkoutPricing.baseAmountKobo,
    });
  } catch (error) {
    logServerError("Payment initialize failed", error);
    res.status(500).json({ error: "Unable to start checkout right now." });
  }
});

app.post("/api/payments/verify", verifyRateLimit, async (req, res) => {
  try {
    ensurePaystackConfigured();

    const { reference } = req.body ?? {};
    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required." });
    }

    const fulfillment = await verifyAndFulfill(reference, {
      publicApiBaseUrl: getPublicApiBaseUrl(req),
    });
    res.json(fulfillment);
  } catch (error) {
    logServerError("Payment verification failed", error);
    res.status(500).json({ error: "Unable to verify payment right now." });
  }
});

app.post("/api/payments/webhook", webhookRateLimit, async (req, res) => {
  try {
    ensurePaystackConfigured();
    const signature = req.headers["x-paystack-signature"];
    const hash = crypto.createHmac("sha512", paystackSecretKey).update(req.rawBody || "").digest("hex");

    if (!signature || signature !== hash) {
      return res.status(401).json({ error: "Invalid webhook signature." });
    }

    await recordWebhookEvent(req.body);

    res.status(200).json({ received: true });

    if (req.body?.event === "charge.success") {
      const reference = req.body?.data?.reference;
      if (reference) {
        verifyAndFulfill(reference, {
          publicApiBaseUrl: getPublicApiBaseUrl(req),
        }).catch((error) => {
          logServerError("Webhook fulfillment failed", error);
        });
      }
    }
  } catch (error) {
    logServerError("Webhook processing failed", error);
    res.status(500).json({ error: "Unable to process webhook." });
  }
});

app.get("/api/download/:token", downloadRateLimit, async (req, res) => {
  const purchase = await findPurchaseByDownloadToken(req.params.token);

  if (!purchase) {
    return res.status(404).json({ error: "Download link is invalid or has expired." });
  }

  const expiresAt = getPurchaseExpiry(purchase);
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return res.status(410).json({ error: "This download link has expired." });
  }

  const course = await getCourseForCheckout(purchase.courseSlug);
  const fallbackCourse = findDigitalCourse(purchase.courseSlug);
  const deliveryAsset =
    purchase.deliveryAsset ||
    (Array.isArray(course?.assets) ? course.assets.find((asset) => asset?.url) : null);
  const filePath = purchase.filePath || course?.filePath || fallbackCourse?.filePath;
  const fileName = resolveDownloadFileName({
    asset: deliveryAsset,
    fallbackFileName:
      purchase.fileName ||
      course?.fileName ||
      fallbackCourse?.fileName ||
      "dwbb-course-materials.txt",
  });

  if (deliveryAsset?.url) {
    try {
      const assetResponse = await fetch(deliveryAsset.url);

      if (!assetResponse.ok) {
        return res.status(502).json({ error: "Course materials are temporarily unavailable." });
      }

      const fileBuffer = Buffer.from(await assetResponse.arrayBuffer());
      const contentType = getDownloadMimeType(fileName) || assetResponse.headers.get("content-type") || "application/octet-stream";
      const encodedFileName = encodeURIComponent(fileName).replace(/['()]/g, escape).replace(/\*/g, "%2A");
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${fileName.replace(/"/g, "")}"; filename*=UTF-8''${encodedFileName}`);
      res.setHeader("Content-Length", String(fileBuffer.byteLength));
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("X-Download-Options", "noopen");
      res.end(fileBuffer);
      return;
    } catch (error) {
      logServerError(`Cloudinary download failed for ${purchase.reference}`, error);
      return res.status(502).json({ error: "Course materials are temporarily unavailable." });
    }
  }

  if (!filePath || !fileName) {
    return res.status(404).json({ error: "Course materials are no longer available." });
  }

  res.download(filePath, fileName);
});

app.listen(port, () => {
  console.log(`DWBB Academy backend running on http://localhost:${port}`);
});

async function verifyAndFulfill(reference, options = {}) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
    },
  });
  const payload = await response.json();

  if (!response.ok || !payload.status) {
    throw new Error(payload.message || "Unable to verify payment.");
  }

  const transaction = payload.data;
  const courseSlug = transaction.metadata?.courseSlug;
  const customerName = transaction.metadata?.customerName || transaction.customer?.first_name || "Customer";
  const customerPhone = transaction.metadata?.customerPhone || "";
  const publicAppBaseUrl = normalizeAppBaseUrl(transaction.metadata?.appBaseUrl || appBaseUrl);
  const publicDownloadBaseUrl = normalizeApiBaseUrl(options.publicApiBaseUrl || transaction.metadata?.publicApiBaseUrl || publicApiBaseUrl || publicAppBaseUrl);
  const course = await getCourseForCheckout(courseSlug);

  if (!course) {
    throw new Error("Purchased course could not be identified.");
  }

  if (transaction.status !== "success") {
    throw new Error("Payment has not been completed successfully.");
  }

  const amountPaidKobo = Number(transaction.amount || 0);
  const paystackFeeKobo = Number(transaction.fees || 0);
  const metadataChargedAmountKobo = parseOptionalAmount(transaction.metadata?.chargedAmountKobo);
  const metadataTargetAmountKobo = parseOptionalAmount(transaction.metadata?.targetAmountKobo);
  const metadataProcessingFeeKobo = parseOptionalAmount(transaction.metadata?.processingFeeKobo);
  const currentCheckoutPricing = getCheckoutPricing(course.priceNaira);
  const currentAmountCandidates = new Set([currentCheckoutPricing.totalChargeKobo, course.priceNaira * 100]);
  const recordedAttempt = await findPaymentAttempt(reference);
  const recordedAttemptAmountKobo = parseOptionalAmount(recordedAttempt?.amount);
  const recordedAttemptTargetAmountKobo = parseOptionalAmount(recordedAttempt?.targetAmountKobo);
  const recordedAttemptProcessingFeeKobo = parseOptionalAmount(recordedAttempt?.processingFeeKobo);

  if (metadataChargedAmountKobo !== null && amountPaidKobo !== metadataChargedAmountKobo) {
    throw new Error("Payment amount mismatch detected.");
  }

  if (metadataChargedAmountKobo === null && recordedAttemptAmountKobo !== null && amountPaidKobo !== recordedAttemptAmountKobo) {
    throw new Error("Payment amount mismatch detected.");
  }

  if (
    metadataChargedAmountKobo === null &&
    recordedAttemptAmountKobo === null &&
    !currentAmountCandidates.has(amountPaidKobo) &&
    !String(reference).startsWith(`dwbb-${course.slug}-`)
  ) {
    throw new Error("Payment amount mismatch detected.");
  }

  const inferredNetAmountKobo = Math.max(amountPaidKobo - paystackFeeKobo, 0);
  const targetAmountKobo = metadataTargetAmountKobo ?? recordedAttemptTargetAmountKobo ?? inferredNetAmountKobo;
  const processingFeeKobo = metadataProcessingFeeKobo ?? recordedAttemptProcessingFeeKobo ?? paystackFeeKobo;
  const deliveryAsset = Array.isArray(course.assets) ? course.assets.find((asset) => asset?.url) || null : null;

  const existing = await findPurchaseByReference(reference);

  if (existing) {
    return {
      success: true,
      alreadyFulfilled: true,
      courseTitle: existing.courseTitle,
      emailPreviewUrl: existing.emailPreviewUrl || null,
      downloadUrl: `${normalizeApiBaseUrl(existing.downloadBaseUrl || publicDownloadBaseUrl)}/api/download/${existing.downloadToken}`,
      message: "Payment verified. Your download is ready.",
    };
  }

  const downloadToken = crypto.randomBytes(24).toString("hex");
  const expiresAt = createDownloadExpiry().toISOString();
  const downloadUrl = `${publicDownloadBaseUrl}/api/download/${downloadToken}`;

  const purchase = {
    reference,
    courseSlug: course.slug,
    courseTitle: course.title,
    email: transaction.customer?.email,
    name: customerName,
    phone: customerPhone,
    amount: amountPaidKobo,
    chargedAmountKobo: amountPaidKobo,
    coursePriceKobo: targetAmountKobo,
    processingFeeKobo,
    paidAt: new Date().toISOString(),
    deliveryAsset,
    downloadToken,
    downloadBaseUrl: publicDownloadBaseUrl,
    expiresAt,
    emailDeliveryStatus: transaction.customer?.email ? "pending" : "skipped",
    emailPreviewUrl: null,
    fileName: deliveryAsset?.fileName || course.fileName || null,
  };

  await createPurchaseRecord(purchase);
  await mirrorPurchaseSafe({ purchase, transaction, course });

  let emailMessage = `Payment verified. Download access is ready for ${downloadLinkTtlDays} days.`;

  if (transaction.customer?.email) {
    try {
      const emailResult = await sendConfirmationEmail({
        appBaseUrl: publicAppBaseUrl,
        courseTitle: course.title,
        customerName,
        email: transaction.customer?.email,
        downloadUrl,
      });

      purchase.emailPreviewUrl = emailResult.previewUrl || null;
      purchase.emailDeliveryStatus = "sent";
      await updatePurchaseRecord(reference, {
        emailDeliveryStatus: purchase.emailDeliveryStatus,
        emailPreviewUrl: purchase.emailPreviewUrl,
      });

      emailMessage = emailResult.previewUrl
        ? `${emailMessage} A preview email was generated for testing.`
        : `${emailMessage} A confirmation email has been sent.`;
    } catch (error) {
      purchase.emailDeliveryStatus = "failed";
      await updatePurchaseRecord(reference, {
        emailDeliveryStatus: purchase.emailDeliveryStatus,
      });
      logServerError(`Confirmation email failed for ${reference}`, error);
      emailMessage = `${emailMessage} Your materials are available now, but the confirmation email could not be sent automatically.`;
    }
  }

  return {
    success: true,
    courseTitle: course.title,
    emailPreviewUrl: purchase.emailPreviewUrl,
    downloadUrl,
    message: emailMessage,
  };
}

function securityHeadersMiddleware(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
}

function requireAdminAuth(options = {}) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

      if (!token) {
        req.requestLogger?.warn("auth.admin.missing_token");
        return res.status(401).json({ error: "Authentication required." });
      }

      const auth = getFirebaseAdminAuth();
      if (!auth) {
        req.requestLogger?.error("auth.admin.firebase_not_configured");
        return res.status(503).json({ error: "Admin authentication is not configured." });
      }

      const decodedToken = await auth.verifyIdToken(token, true);
      const email = normalizeEmail(decodedToken.email);

      if (!email) {
        req.requestLogger?.warn("auth.admin.email_required", {
          uid: decodedToken.uid,
        });
        return res.status(403).json({ error: "A verified email is required." });
      }

      const adminUser = await resolveAdminUser(email, decodedToken.uid);
      if (!adminUser || adminUser.active === false) {
        req.requestLogger?.warn("auth.admin.access_denied", {
          email,
          uid: decodedToken.uid,
        });
        return res.status(403).json({ error: "You do not have access to this console." });
      }

      if (options.superAdminOnly && adminUser.role !== "super_admin") {
        req.requestLogger?.warn("auth.admin.super_admin_required", {
          email,
          uid: decodedToken.uid,
          role: adminUser.role,
        });
        return res.status(403).json({ error: "Super admin access is required." });
      }

      req.adminUser = {
        uid: decodedToken.uid,
        email,
        role: adminUser.role,
        active: adminUser.active !== false,
        protected: adminUser.protected === true,
      };
      req.requestLogger = req.requestLogger?.child({
        actorEmail: email,
        actorRole: adminUser.role,
      });
      req.requestLogger?.info("auth.admin.authenticated", {
        uid: decodedToken.uid,
        protected: adminUser.protected === true,
      });

      next();
    } catch (error) {
      logServerError("Admin authentication failed", error);
      if (isFirestoreQuotaError(error)) {
        return res.status(503).json({
          error: "Firestore usage is temporarily exhausted. The admin console will be available again once quota resets or billing is increased.",
        });
      }
      res.status(401).json({ error: "Unable to authenticate this admin session." });
    }
  };
}

function requirePaymentDebug(_req, res, next) {
  if (!enablePaymentDebug) {
    return res.status(404).json({ error: "Not found." });
  }

  next();
}

function createRateLimiter({ key, max, windowMs }) {
  return (req, res, next) => {
    const storeKey = `${key}:${getClientIdentifier(req)}`;
    const now = Date.now();
    const entry = rateLimitStores.get(storeKey);

    if (!entry || entry.resetAt <= now) {
      rateLimitStores.set(storeKey, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({ error: "Too many requests. Please try again shortly." });
      return;
    }

    entry.count += 1;
    rateLimitStores.set(storeKey, entry);
    next();
  };
}

function getClientIdentifier(req) {
  return req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
}

function parseAllowedOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseOriginValue(origin) {
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

function isLoopbackHostname(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

function originsMatch(candidate, trusted) {
  if (candidate === trusted) {
    return true;
  }

  const candidateUrl = parseOriginValue(candidate);
  const trustedUrl = parseOriginValue(trusted);

  if (!candidateUrl || !trustedUrl) {
    return false;
  }

  if (candidateUrl.protocol !== trustedUrl.protocol) {
    return false;
  }

  if (candidateUrl.port !== trustedUrl.port) {
    return false;
  }

  if (candidateUrl.hostname === trustedUrl.hostname) {
    return true;
  }

  return isLoopbackHostname(candidateUrl.hostname) && isLoopbackHostname(trustedUrl.hostname);
}

function parseDashboardRange(value) {
  if (value === "today" || value === "7d" || value === "30d" || value === "all") {
    return value;
  }

  return "30d";
}

function isAllowedOrigin(origin) {
  if (allowedOrigins.length > 0) {
    return allowedOrigins.some((allowedOrigin) => originsMatch(origin, allowedOrigin));
  }

  if (!isProduction) {
    return (
      origin === "http://localhost:5173" ||
      origin === "http://127.0.0.1:5173" ||
      origin === "http://localhost:5174" ||
      origin === "http://127.0.0.1:5174" ||
      origin.endsWith(".ngrok-free.app")
    );
  }

  return false;
}

function getPublicAppBaseUrl(req) {
  const forwardedProtoHeader = req.headers["x-forwarded-proto"];
  const forwardedHostHeader = req.headers["x-forwarded-host"];
  const hostHeader = req.headers.host;
  const originHeader = req.headers.origin;
  const forwardedProto = Array.isArray(forwardedProtoHeader) ? forwardedProtoHeader[0] : forwardedProtoHeader;
  const forwardedHost = Array.isArray(forwardedHostHeader) ? forwardedHostHeader[0] : forwardedHostHeader;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  if (origin && (isAllowedOrigin(origin) || !isProduction)) {
    return normalizeAppBaseUrl(origin);
  }

  if (trustProxy && (forwardedHost || hostHeader)) {
    return normalizeAppBaseUrl(`${forwardedProto || "http"}://${forwardedHost || hostHeader}`);
  }

  if (!isProduction && hostHeader) {
    return normalizeAppBaseUrl(`http://${hostHeader}`);
  }

  return normalizeAppBaseUrl(appBaseUrl);
}

function normalizeAppBaseUrl(value) {
  return String(value || appBaseUrl).replace(/\/+$/, "");
}

function getPublicApiBaseUrl(req) {
  const forwardedProtoHeader = req.headers["x-forwarded-proto"];
  const forwardedHostHeader = req.headers["x-forwarded-host"];
  const hostHeader = req.headers.host;
  const forwardedProto = Array.isArray(forwardedProtoHeader) ? forwardedProtoHeader[0] : forwardedProtoHeader;
  const forwardedHost = Array.isArray(forwardedHostHeader) ? forwardedHostHeader[0] : forwardedHostHeader;

  if (publicApiBaseUrl) {
    return normalizeApiBaseUrl(publicApiBaseUrl);
  }

  if (trustProxy && (forwardedHost || forwardedProto)) {
    return normalizeApiBaseUrl(`${forwardedProto || "https"}://${forwardedHost || hostHeader}`);
  }

  if (hostHeader) {
    return normalizeApiBaseUrl(`${isProduction ? "https" : "http"}://${hostHeader}`);
  }

  return normalizeApiBaseUrl(appBaseUrl);
}

function normalizeApiBaseUrl(value) {
  return String(value || publicApiBaseUrl || appBaseUrl).replace(/\/+$/, "");
}

function shouldSkipAdminAuditLog(req) {
  return req.headers["x-admin-background-refresh"] === "1";
}

function readCachedAdminUser(email) {
  const cacheEntry = adminUserCache.get(email);
  if (!cacheEntry) {
    return null;
  }

  if (cacheEntry.expiresAt <= Date.now()) {
    adminUserCache.delete(email);
    return null;
  }

  return cacheEntry.value;
}

function writeCachedAdminUser(email, adminUser) {
  adminUserCache.set(email, {
    value: adminUser,
    expiresAt: Date.now() + ADMIN_USER_CACHE_TTL_MS,
  });
}

function clearCachedAdminUser(email) {
  adminUserCache.delete(normalizeEmail(email));
}

function shouldSkipAdminActivity(key, ttlMs) {
  const now = Date.now();
  const cacheEntry = adminActivityCache.get(key);

  if (cacheEntry && cacheEntry > now) {
    return true;
  }

  adminActivityCache.set(key, now + ttlMs);
  return false;
}

function getSuperAdminEmails() {
  return String(process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

function isProtectedSuperAdminEmail(email) {
  return getSuperAdminEmails().includes(normalizeEmail(email));
}

async function resolveAdminUser(email, uid) {
  if (isProtectedSuperAdminEmail(email)) {
    return {
      email,
      uid,
      role: "super_admin",
      active: true,
      protected: true,
    };
  }

  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const cachedAdminUser = readCachedAdminUser(email);
  if (cachedAdminUser) {
    return cachedAdminUser;
  }

  const adminUser = await getAdminUserByEmail(email);
  writeCachedAdminUser(email, adminUser);
  return adminUser;
}

async function loadManagedCoursesForPublic() {
  try {
    return await listManagedCoursesSafe();
  } catch {
    return digitalCourseCatalog.map((course, index) => ({
      ...course,
      summary: "",
      longDescription: "",
      featured: true,
      published: true,
      order: index,
    }));
  }
}

async function getCourseForCheckout(slug) {
  if (isFirebaseAdminConfigured()) {
    try {
      const managedCourse = await getManagedCourse(slug);
      if (managedCourse) {
        return managedCourse;
      }
    } catch (error) {
      logServerError("Managed course lookup failed", error);
    }
  }

  return findDigitalCourse(slug);
}

function sanitizeCourseUpdates(payload) {
  const updates = {};

  if (typeof payload.slug === "string" && payload.slug.trim()) {
    updates.slug = payload.slug.trim();
  }
  if (typeof payload.title === "string") {
    updates.title = payload.title.trim();
  }
  if (typeof payload.shortTitle === "string") {
    updates.shortTitle = payload.shortTitle.trim();
  }
  if (typeof payload.summary === "string") {
    updates.summary = payload.summary;
  }
  if (typeof payload.longDescription === "string") {
    updates.longDescription = payload.longDescription;
  }
  if (typeof payload.priceNaira === "number") {
    updates.priceNaira = Math.max(Math.round(payload.priceNaira), 0);
  }
  if (Array.isArray(payload.deliverables)) {
    updates.deliverables = payload.deliverables.map((item) => String(item)).filter(Boolean);
  }
  if (typeof payload.published === "boolean") {
    updates.published = payload.published;
  }
  if (typeof payload.featured === "boolean") {
    updates.featured = payload.featured;
  }
  if (Array.isArray(payload.assets)) {
    updates.assets = payload.assets;
  }
  if (typeof payload.order === "number") {
    updates.order = payload.order;
  }

  return updates;
}

function sanitizeAssetFileName(fileName) {
  const trimmed = String(fileName || "").trim();
  const sanitized = trimmed.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "");
  return sanitized || "dwbb-course-materials.txt";
}

function ensureFileNameExtension(fileName, format) {
  const normalizedFileName = String(fileName || "").trim();
  const normalizedFormat = String(format || "").trim().replace(/^\./, "");

  if (!normalizedFileName) {
    return normalizedFormat ? `dwbb-course-materials.${normalizedFormat}` : "dwbb-course-materials";
  }

  if (!normalizedFormat || path.extname(normalizedFileName)) {
    return normalizedFileName;
  }

  return `${normalizedFileName}.${normalizedFormat}`;
}

function resolveDownloadFileName({ asset, fallbackFileName }) {
  if (!asset) {
    return fallbackFileName;
  }

  const candidateName =
    asset.fileName ||
    asset.originalFilename ||
    fallbackFileName ||
    "dwbb-course-materials";

  return ensureFileNameExtension(candidateName, asset.format);
}

function getDownloadMimeType(fileName) {
  const extension = path.extname(String(fileName || "")).toLowerCase();

  return (
    {
      ".csv": "text/csv; charset=utf-8",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".json": "application/json; charset=utf-8",
      ".pdf": "application/pdf",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".txt": "text/plain; charset=utf-8",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".zip": "application/zip",
    }[extension] || null
  );
}

function getPaystackMode() {
  return String(paystackPublicKey || "").startsWith("pk_live_") ? "live" : "test";
}

async function listManagedCoursesSafe() {
  if (!isFirebaseAdminConfigured()) {
    return digitalCourseCatalog.map((course, index) => ({
      ...course,
      summary: "",
      longDescription: "",
      featured: true,
      published: true,
      order: index,
    }));
  }

  return listManagedCourses();
}

async function recordAdminLoginSafe(adminUser) {
  if (!isFirebaseAdminConfigured()) {
    return;
  }

  if (shouldSkipAdminActivity(`login:${adminUser.uid || adminUser.email}`, ADMIN_LOGIN_DEDUP_TTL_MS)) {
    return;
  }

  await recordAdminLogin(adminUser);
}

async function recordAuditLogSafe(payload) {
  if (
    String(payload?.action || "").endsWith(".viewed") &&
    shouldSkipAdminActivity(
      `audit:${payload.actorEmail || "system"}:${payload.action}:${payload.entityType}:${payload.entityId}`,
      ADMIN_VIEW_AUDIT_DEDUP_TTL_MS,
    )
  ) {
    return;
  }

  pendingAuditLogs.unshift({
    actorEmail: payload.actorEmail || "",
    actorRole: payload.actorRole || "",
    action: payload.action || "",
    entityType: payload.entityType || "",
    entityId: payload.entityId || "",
    metadata: payload.metadata || {},
    createdAt: new Date().toISOString(),
    source: "memory",
  });
}

async function listAuditLogsSafe() {
  if (!isFirebaseAdminConfigured()) {
    return [];
  }

  return listAuditLogs();
}

async function listLoginLogsSafe() {
  if (!isFirebaseAdminConfigured()) {
    return [];
  }

  return listLoginLogs();
}

async function listAdminUsersSafe() {
  if (!isFirebaseAdminConfigured()) {
    return [];
  }

  const users = await listAdminUsers();
  const userMap = new Map(users.map((user) => [normalizeEmail(user.email), user]));

  for (const email of getSuperAdminEmails()) {
    userMap.set(email, {
      ...(userMap.get(email) || { id: email, email }),
      email,
      role: "super_admin",
      active: true,
      protected: true,
    });
  }

  return Array.from(userMap.values()).sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
}

async function listNotificationsSafe() {
  if (!isFirebaseAdminConfigured()) {
    return { notifications: [], unreadCount: 0 };
  }

  return listNotifications();
}

function mergeAuditLogsWithPending(persistedLogs = []) {
  return [...pendingAuditLogs, ...persistedLogs]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 100);
}

async function mirrorPurchaseSafe(payload) {
  if (!isFirebaseAdminConfigured()) {
    return;
  }

  try {
    await mirrorVerifiedPurchase(payload);
  } catch (error) {
    logServerError("Firestore purchase mirror failed", error);
  }
}

function createDownloadExpiry() {
  const ttlMs = Math.max(downloadLinkTtlDays, 1) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ttlMs);
}

function getPurchaseExpiry(purchase) {
  if (purchase.expiresAt) {
    return new Date(purchase.expiresAt);
  }

  if (!purchase.paidAt) {
    return null;
  }

  const paidAt = new Date(purchase.paidAt);
  return new Date(paidAt.getTime() + Math.max(downloadLinkTtlDays, 1) * 24 * 60 * 60 * 1000);
}

async function sendConfirmationEmail({ appBaseUrl, courseTitle, customerName, email, downloadUrl }) {
  if (!email) {
    return { previewUrl: null };
  }

  const safeCustomerName = escapeHtml(customerName || "Customer");
  const safeCourseTitle = escapeHtml(courseTitle || "Your course");
  const safeDownloadUrl = escapeHtml(downloadUrl);
  const safeAppBaseUrl = String(appBaseUrl || "http://localhost:5173").replace(/\/+$/, "");
  const logoUrl = `${safeAppBaseUrl}/dwbb-logo.png`;
  const supportUrl = "https://wa.me/2348106258080?text=Hello%20DWBB%20Academy!%20I%20need%20help%20with%20my%20course%20download.";

  const html = `
    <div style="margin:0;padding:32px 16px;background:#f8fafc;font-family:Arial,sans-serif;color:#1e293b;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#0a1e4a 0%,#1a3a7a 100%);padding:28px 32px;text-align:center;">
          <img src="${logoUrl}" alt="DWBB Academy logo" style="height:72px;width:auto;display:block;margin:0 auto 16px;" />
          <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#f5c842;font-weight:700;">Payment Confirmed</div>
          <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">Your course materials are ready</h1>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#1e293b;">Hello ${safeCustomerName},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#475569;">
            Thank you for purchasing <strong style="color:#0a1e4a;">${safeCourseTitle}</strong>. Your payment was confirmed successfully, and your downloadable materials are now available.
          </p>
          <div style="margin:24px 0;padding:20px;border:1px solid #dbeafe;background:#f8fbff;border-radius:18px;">
            <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;font-weight:700;">Access Window</p>
            <p style="margin:0;font-size:16px;line-height:1.6;color:#1e293b;">
              Your secure download link will remain active for <strong>${downloadLinkTtlDays} days</strong>.
            </p>
          </div>
          <div style="margin:28px 0;text-align:center;">
            <a href="${safeDownloadUrl}" style="display:inline-block;background:#f5c842;color:#0a1e4a;text-decoration:none;font-weight:700;font-size:15px;padding:14px 24px;border-radius:999px;">
              Download Course Materials
            </a>
          </div>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
            If the button does not open in your email client, contact support and we will help you regain access quickly.
          </p>
          <div style="padding-top:20px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#475569;">
              Need help accessing your materials?
            </p>
            <a href="${supportUrl}" style="color:#1a3a7a;text-decoration:none;font-weight:700;">Contact DWBB Academy Support</a>
          </div>
        </div>
      </div>
    </div>
  `.trim();

  const transporter = await createMailTransport();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "DWBB Academy <no-reply@dwbbacademy.com>",
    to: email,
    subject: `Your ${courseTitle} download is ready`,
    html,
    text: [
      `Hello ${customerName},`,
      "",
      `Thank you for purchasing ${courseTitle}.`,
      "Your payment was confirmed successfully.",
      "",
      "Download your course materials using the secure button in the HTML email.",
      `Direct fallback link: ${downloadUrl}`,
      `This download link expires in ${downloadLinkTtlDays} days.`,
      "",
      "If you need help, reply to this email or contact DWBB Academy.",
    ].join("\n"),
  });

  return {
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let cachedTransportPromise;

async function createMailTransport() {
  if (!cachedTransportPromise) {
    cachedTransportPromise = (async () => {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: String(process.env.SMTP_SECURE || "false") === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      }

      const account = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });
    })();
  }

  return cachedTransportPromise;
}

async function recordPaymentAttempt(attempt) {
  if (!enablePaymentDebug) {
    return;
  }

  const attempts = await readJsonFile(attemptsFile);
  attempts.push(attempt);
  await writeJsonFile(attemptsFile, attempts);
}

async function findPaymentAttempt(reference) {
  if (!enablePaymentDebug || !reference) {
    return null;
  }

  const attempts = await readJsonFile(attemptsFile);
  return attempts.find((attempt) => attempt.reference === reference) || null;
}

function parseOptionalAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

async function recordWebhookEvent(payload) {
  if (!enablePaymentDebug) {
    return;
  }

  const events = await readJsonFile(webhookEventsFile);
  events.push({
    event: payload?.event || "unknown",
    reference: payload?.data?.reference || null,
    receivedAt: new Date().toISOString(),
    payload,
  });
  await writeJsonFile(webhookEventsFile, events);
}

async function ensureDataFile() {
  try {
    await ensureDataDirectory(configuredDataDir);
  } catch (error) {
    if (configuredDataDir !== fallbackDataDir) {
      if (!warnedAboutFallbackDataDir) {
        logServerError(
          `Primary DATA_DIR unavailable at ${configuredDataDir}. Falling back to ${fallbackDataDir}`,
          error,
        );
        warnedAboutFallbackDataDir = true;
      }

      await ensureDataDirectory(fallbackDataDir);
      return;
    }

    throw error;
  }
}

async function ensureDataDirectory(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });

  if (dataDir !== targetDir) {
    dataDir = targetDir;
    purchasesFile = path.join(dataDir, "purchases.json");
    attemptsFile = path.join(dataDir, "payment-attempts.json");
    webhookEventsFile = path.join(dataDir, "webhook-events.json");
  }

  await Promise.all([
    ensureJsonArrayFile(purchasesFile),
    ensureJsonArrayFile(attemptsFile),
    ensureJsonArrayFile(webhookEventsFile),
  ]);
}

function getPurchaseCollection() {
  const firestore = getFirebaseAdminFirestore();
  return firestore ? firestore.collection(PURCHASE_COLLECTION) : null;
}

async function findPurchaseByReference(reference) {
  if (!reference) {
    return null;
  }

  const purchaseCollection = getPurchaseCollection();

  if (purchaseCollection) {
    const doc = await purchaseCollection.doc(reference).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  const purchases = await readJsonFile(purchasesFile);
  return purchases.find((entry) => entry.reference === reference) || null;
}

async function findPurchaseByDownloadToken(downloadToken) {
  if (!downloadToken) {
    return null;
  }

  const purchaseCollection = getPurchaseCollection();

  if (purchaseCollection) {
    const snapshot = await purchaseCollection.where("downloadToken", "==", downloadToken).limit(1).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    return null;
  }

  const purchases = await readJsonFile(purchasesFile);
  return purchases.find((entry) => entry.downloadToken === downloadToken) || null;
}

async function createPurchaseRecord(purchase) {
  const purchaseCollection = getPurchaseCollection();

  if (purchaseCollection) {
    await purchaseCollection.doc(purchase.reference).set(purchase, { merge: false });
    return;
  }

  const purchases = await readJsonFile(purchasesFile);
  purchases.push(purchase);
  await writeJsonFile(purchasesFile, purchases);
}

async function updatePurchaseRecord(reference, updates) {
  const purchaseCollection = getPurchaseCollection();

  if (purchaseCollection) {
    await purchaseCollection.doc(reference).set(
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return;
  }

  const purchases = await readJsonFile(purchasesFile);
  const purchaseIndex = purchases.findIndex((entry) => entry.reference === reference);

  if (purchaseIndex < 0) {
    return;
  }

  purchases[purchaseIndex] = {
    ...purchases[purchaseIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(purchasesFile, purchases);
}

function ensurePaystackConfigured() {
  if (!paystackSecretKey || !paystackPublicKey) {
    throw new Error("Paystack environment variables are missing.");
  }
}

function formatNaira(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function logServerError(context, error) {
  if (error instanceof Error) {
    logger.error("server.error", {
      context,
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  logger.error("server.error", {
    context,
    error,
  });
}

function isFirestoreQuotaError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");

  return (
    code === "8" ||
    code.toUpperCase() === "RESOURCE_EXHAUSTED" ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("quota exceeded")
  );
}

async function ensureJsonArrayFile(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]", "utf8");
  }
}

async function readJsonFile(filePath) {
  await ensureDataFile();
  await waitForPendingJsonWrite(filePath);
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function writeJsonFile(filePath, value) {
  await ensureDataFile();
  const previousWrite = pendingJsonWrites.get(filePath) || Promise.resolve();
  const nextWrite = previousWrite
    .catch(() => {})
    .then(async () => {
      const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tempFilePath, JSON.stringify(value, null, 2), "utf8");
      await fs.rename(tempFilePath, filePath);
    });

  pendingJsonWrites.set(filePath, nextWrite);

  try {
    await nextWrite;
  } finally {
    if (pendingJsonWrites.get(filePath) === nextWrite) {
      pendingJsonWrites.delete(filePath);
    }
  }
}

async function waitForPendingJsonWrite(filePath) {
  const pendingWrite = pendingJsonWrites.get(filePath);
  if (!pendingWrite) {
    return;
  }

  await pendingWrite.catch(() => {});
}
