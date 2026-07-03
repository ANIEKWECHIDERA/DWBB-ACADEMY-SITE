import cors from "cors";
import express from "express";

import {
  clearManagedCourseAssets,
  deleteAdminUserByEmail,
  deleteCustomersByEmail,
  deleteManagedCourse,
  deleteTransactionsByReference,
  dismissNotification,
  ensureManagedCoursesSeeded,
  getUnreadNotificationCount,
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
  updateManagedCourse,
  updateNotificationStatus,
  upsertAdminUser,
} from "./admin-store.mjs";
import { digitalCourseCatalog, findDigitalCourse } from "./course-catalog.mjs";
import {
  adminLoginDedupTtlMs,
  adminUserCacheTtlMs,
  adminViewAuditDedupTtlMs,
  allowedOrigins,
  appBaseUrl,
  configuredDataDir,
  downloadLinkTtlDays,
  enablePaymentDebug,
  fallbackDataDir,
  isProduction,
  paystackPublicKey,
  paystackSecretKey,
  port,
  publicApiBaseUrl,
  purchaseCollectionName,
  trustProxy,
} from "./config.mjs";
import {
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
  isFirebaseAdminConfigured,
} from "./firebase-admin.mjs";
import { childLogger, logger } from "./logger.mjs";
import { registerAdminRoutes } from "./routes/admin-routes.mjs";
import { registerPaymentRoutes } from "./routes/payment-routes.mjs";
import { registerPublicRoutes } from "./routes/public-routes.mjs";
import { createAdminService } from "./services/admin-service.mjs";
import { createAdminRealtimeService } from "./services/admin-realtime.mjs";
import { createCourseService } from "./services/course-service.mjs";
import { createHttpService } from "./services/http.mjs";
import { createMailer } from "./services/mailer.mjs";
import { createPaymentService } from "./services/payment-service.mjs";
import { createPurchaseStore } from "./services/purchase-store.mjs";
import {
  formatNaira,
  isFirestoreQuotaError,
  logServerError,
} from "./server-utils.mjs";

const app = express();

if (trustProxy) {
  const trustProxyValue = Number(trustProxy);
  app.set(
    "trust proxy",
    Number.isNaN(trustProxyValue) ? trustProxy : trustProxyValue,
  );
}

const httpService = createHttpService({
  allowedOrigins,
  appBaseUrl,
  publicApiBaseUrl,
  isProduction,
  trustProxy,
});

const courseService = createCourseService({
  digitalCourseCatalog,
  findDigitalCourse,
  getManagedCourse,
  isFirebaseAdminConfigured,
  listManagedCourses,
  logServerError,
});

const purchaseStore = createPurchaseStore({
  configuredDataDir,
  fallbackDataDir,
  downloadLinkTtlDays,
  enablePaymentDebug,
  getFirebaseAdminFirestore,
  logger,
  purchaseCollectionName,
});

const mailer = createMailer({
  appBaseUrl,
  downloadLinkTtlDays,
});

const adminService = createAdminService({
  adminLoginDedupTtlMs,
  adminUserCacheTtlMs,
  adminViewAuditDedupTtlMs,
  getAdminUserByEmail,
  getSuperAdminEmails,
  isFirebaseAdminConfigured,
  isFirestoreQuotaError,
  listAdminUsers,
  listAuditLogs,
  listLoginLogs,
  listNotifications,
  logServerError,
  normalizeEmail,
  recordAdminLogin,
});

const adminRealtime = createAdminRealtimeService({
  authenticateAdminToken: adminService.authenticateAdminToken,
  getFirebaseAdminAuth,
  getUnreadNotificationCount,
  isFirebaseAdminConfigured: isFirebaseAdminConfigured(),
  logServerError,
});

const paymentService = createPaymentService({
  adminRealtime,
  appBaseUrl,
  createDownloadExpiry: purchaseStore.createDownloadExpiry,
  createPurchaseRecord: purchaseStore.createPurchaseRecord,
  downloadLinkTtlDays,
  findPaymentAttempt: purchaseStore.findPaymentAttempt,
  findPurchaseByReference: purchaseStore.findPurchaseByReference,
  formatNaira,
  getCourseForCheckout: courseService.getCourseForCheckout,
  logServerError,
  mailer,
  mirrorPurchaseSafe,
  normalizeApiBaseUrl: httpService.normalizeApiBaseUrl,
  paystackPublicKey,
  paystackSecretKey,
  updatePurchaseRecord: purchaseStore.updatePurchaseRecord,
});

const requireAdminAuth = (options = {}) =>
  adminService.requireAdminAuth({
    getFirebaseAdminAuth,
    superAdminOnly: options.superAdminOnly,
  });

app.disable("x-powered-by");
app.use(httpService.securityHeadersMiddleware);
app.use(cors(httpService.createCorsOptions()));
app.use(
  express.json({
    limit: "12mb",
    verify: (req, _res, buffer) => {
      req.rawBody = buffer.toString();
    },
  }),
);
app.use((req, res, next) => {
  req.requestId = globalThis.crypto.randomUUID();
  req.requestLogger = childLogger({
    requestId: req.requestId,
    method: req.method,
    path: req.path,
  });

  const startedAt = Date.now();
  req.requestLogger.debug("request.received", {
    query: req.query,
    ip: httpService.getClientIdentifier(req),
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

const initializeRateLimit = httpService.createRateLimiter({
  key: "payments-initialize",
  max: 12,
  windowMs: 15 * 60 * 1000,
});
const verifyRateLimit = httpService.createRateLimiter({
  key: "payments-verify",
  max: 60,
  windowMs: 15 * 60 * 1000,
});
const webhookRateLimit = httpService.createRateLimiter({
  key: "payments-webhook",
  max: 120,
  windowMs: 15 * 60 * 1000,
});
const downloadRateLimit = httpService.createRateLimiter({
  key: "downloads",
  max: 120,
  windowMs: 15 * 60 * 1000,
});

registerPublicRoutes(app, {
  courseService,
  formatNaira,
});

registerAdminRoutes(app, {
  adminRealtime,
  adminService,
  clearManagedCourseAssets,
  courseService,
  deleteAdminUserByEmail,
  deleteCustomersByEmail,
  deleteManagedCourse,
  deleteTransactionsByReference,
  dismissNotification,
  ensureManagedCoursesSeeded,
  getDashboardMetrics,
  getSuperAdminEmails,
  httpService,
  isFirebaseAdminConfigured,
  isFirestoreQuotaError,
  listCustomers,
  listTransactions,
  logServerError,
  markAllNotificationsRead,
  normalizeEmail,
  paymentService,
  recordAuditLogsBatch,
  reorderManagedCourses,
  replaceManagedCourseAsset,
  requireAdminAuth,
  updateManagedCourse,
  updateNotificationStatus,
  upsertAdminUser,
});

registerPaymentRoutes(app, {
  courseService,
  downloadRateLimit,
  enablePaymentDebug,
  findDigitalCourse,
  getClientIdentifier: httpService.getClientIdentifier,
  getPublicApiBaseUrl: httpService.getPublicApiBaseUrl,
  getPublicAppBaseUrl: httpService.getPublicAppBaseUrl,
  initializeRateLimit,
  logServerError,
  paystackPublicKey,
  paystackSecretKey,
  paymentService,
  purchaseStore,
  verifyRateLimit,
  webhookRateLimit,
});

const server = app.listen(port, () => {
  console.log(`DWBB Academy backend running on http://localhost:${port}`);
});

adminRealtime.attachToServer(server);

function getSuperAdminEmails() {
  return String(process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

async function mirrorPurchaseSafe(payload) {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  try {
    return await mirrorVerifiedPurchase(payload);
  } catch (error) {
    logServerError("Firestore purchase mirror failed", error);
    return null;
  }
}
