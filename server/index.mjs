import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";

import {
  deleteManagedCourse,
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
  listTransactions,
  mirrorVerifiedPurchase,
  normalizeEmail,
  recordAdminLogin,
  recordAuditLog,
  reorderManagedCourses,
  updateManagedCourse,
  upsertAdminUser,
} from "./admin-store.mjs";
import { digitalCourseCatalog, findDigitalCourse } from "./course-catalog.mjs";
import { getFirebaseAdminAuth, isFirebaseAdminConfigured } from "./firebase-admin.mjs";
import { getCheckoutPricing } from "../src/lib/paystackPricing.js";

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || process.env.SERVER_PORT || 8787);
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY;
const enablePaymentDebug = String(process.env.ENABLE_PAYMENT_DEBUG || "false") === "true";
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
const downloadLinkTtlDays = Number(process.env.DOWNLOAD_LINK_TTL_DAYS || 7);
const trustProxy = process.env.TRUST_PROXY;
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), "server/.data");
const purchasesFile = path.join(dataDir, "purchases.json");
const attemptsFile = path.join(dataDir, "payment-attempts.json");
const webhookEventsFile = path.join(dataDir, "webhook-events.json");
const rateLimitStores = new Map();

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
    limit: "100kb",
    verify: (req, _res, buffer) => {
      req.rawBody = buffer.toString();
    },
  }),
);

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
  await recordAuditLogSafe({
    actorEmail: adminUser.email,
    actorRole: adminUser.role,
    action: "admin.session.viewed",
    entityType: "session",
    entityId: adminUser.email,
    metadata: { uid: adminUser.uid },
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

app.get("/api/admin/transactions", requireAdminAuth({ superAdminOnly: true }), async (req, res) => {
  const range = parseDashboardRange(req.query.range);
  const transactions = await listTransactions(range);
  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: "transactions.viewed",
    entityType: "transaction",
    entityId: "collection",
    metadata: { range },
  });
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
  await recordAuditLogSafe({
    actorEmail: req.adminUser.email,
    actorRole: req.adminUser.role,
    action: "customers.viewed",
    entityType: "customer",
    entityId: "collection",
    metadata: { range },
  });
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

app.get("/api/admin/audit-logs", requireAdminAuth({ superAdminOnly: true }), async (_req, res) => {
  const [auditLogs, loginLogs] = await Promise.all([listAuditLogsSafe(), listLoginLogsSafe()]);
  res.json({ auditLogs, loginLogs });
});

app.get("/api/admin/users", requireAdminAuth({ superAdminOnly: true }), async (_req, res) => {
  const users = await listAdminUsersSafe();
  res.json({ users });
});

app.put("/api/admin/users/:email", requireAdminAuth({ superAdminOnly: true }), async (req, res) => {
  const email = req.params.email;
  const role = req.body?.role;

  if (role !== "admin" && role !== "super_admin") {
    return res.status(400).json({ error: "A valid role is required." });
  }

  const user = await upsertAdminUser({
    email,
    role,
    invitedBy: req.adminUser.email,
    active: req.body?.active !== false,
  });

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

    const fulfillment = await verifyAndFulfill(reference);
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
        verifyAndFulfill(reference).catch((error) => {
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
  const purchases = await readPurchases();
  const purchase = purchases.find((entry) => entry.downloadToken === req.params.token);

  if (!purchase) {
    return res.status(404).json({ error: "Download link is invalid or has expired." });
  }

  const expiresAt = getPurchaseExpiry(purchase);
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return res.status(410).json({ error: "This download link has expired." });
  }

  const course = findDigitalCourse(purchase.courseSlug);
  const filePath = purchase.filePath || course?.filePath;
  const fileName = purchase.fileName || course?.fileName;

  if (!filePath || !fileName) {
    return res.status(404).json({ error: "Course materials are no longer available." });
  }

  res.download(filePath, fileName);
});

app.listen(port, () => {
  console.log(`DWBB Academy backend running on http://localhost:${port}`);
});

async function verifyAndFulfill(reference) {
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
  const course = await getCourseForCheckout(courseSlug);

  if (!course) {
    throw new Error("Purchased course could not be identified.");
  }

  if (transaction.status !== "success") {
    throw new Error("Payment has not been completed successfully.");
  }

  const expectedAmountKobo = Number(transaction.metadata?.chargedAmountKobo || getCheckoutPricing(course.priceNaira).totalChargeKobo);
  const legacyAmountKobo = course.priceNaira * 100;

  if (Number(transaction.amount) !== expectedAmountKobo && Number(transaction.amount) !== legacyAmountKobo) {
    throw new Error("Payment amount mismatch detected.");
  }

  const purchases = await readPurchases();
  const existing = purchases.find((entry) => entry.reference === reference);

  if (existing) {
    return {
      success: true,
      alreadyFulfilled: true,
      courseTitle: existing.courseTitle,
      emailPreviewUrl: existing.emailPreviewUrl || null,
      downloadUrl: `${publicAppBaseUrl}/api/download/${existing.downloadToken}`,
      message: "Payment verified. Your download is ready.",
    };
  }

  const downloadToken = crypto.randomBytes(24).toString("hex");
  const expiresAt = createDownloadExpiry().toISOString();
  const downloadUrl = `${publicAppBaseUrl}/api/download/${downloadToken}`;

  const purchase = {
    reference,
    courseSlug: course.slug,
    courseTitle: course.title,
    email: transaction.customer?.email,
    name: customerName,
    phone: customerPhone,
    amount: transaction.amount,
    chargedAmountKobo: Number(transaction.amount),
    coursePriceKobo: Number(transaction.metadata?.targetAmountKobo || course.priceNaira * 100),
    processingFeeKobo: Number(transaction.metadata?.processingFeeKobo || Number(transaction.amount) - course.priceNaira * 100),
    paidAt: new Date().toISOString(),
    downloadToken,
    expiresAt,
    emailDeliveryStatus: transaction.customer?.email ? "pending" : "skipped",
    emailPreviewUrl: null,
  };

  purchases.push(purchase);
  await writePurchases(purchases);
  await mirrorPurchaseSafe({ purchase, transaction, course });

  let emailMessage = `Payment verified. Download access is ready for ${downloadLinkTtlDays} days.`;

  if (transaction.customer?.email) {
    try {
      const emailResult = await sendConfirmationEmail({
        courseTitle: course.title,
        customerName,
        email: transaction.customer?.email,
        downloadUrl,
      });

      purchase.emailPreviewUrl = emailResult.previewUrl || null;
      purchase.emailDeliveryStatus = "sent";
      await writePurchases(purchases);

      emailMessage = emailResult.previewUrl
        ? `${emailMessage} A preview email was generated for testing.`
        : `${emailMessage} A confirmation email has been sent.`;
    } catch (error) {
      purchase.emailDeliveryStatus = "failed";
      await writePurchases(purchases);
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
        return res.status(401).json({ error: "Authentication required." });
      }

      const auth = getFirebaseAdminAuth();
      if (!auth) {
        return res.status(503).json({ error: "Admin authentication is not configured." });
      }

      const decodedToken = await auth.verifyIdToken(token, true);
      const email = normalizeEmail(decodedToken.email);

      if (!email) {
        return res.status(403).json({ error: "A verified email is required." });
      }

      const adminUser = await resolveAdminUser(email, decodedToken.uid);
      if (!adminUser || adminUser.active === false) {
        return res.status(403).json({ error: "You do not have access to this console." });
      }

      if (options.superAdminOnly && adminUser.role !== "super_admin") {
        return res.status(403).json({ error: "Super admin access is required." });
      }

      req.adminUser = {
        uid: decodedToken.uid,
        email,
        role: adminUser.role,
        active: adminUser.active !== false,
      };

      next();
    } catch (error) {
      logServerError("Admin authentication failed", error);
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

function parseDashboardRange(value) {
  if (value === "today" || value === "7d" || value === "30d" || value === "all") {
    return value;
  }

  return "30d";
}

function isAllowedOrigin(origin) {
  if (allowedOrigins.length > 0) {
    return allowedOrigins.includes(origin);
  }

  if (!isProduction) {
    return (
      origin === "http://localhost:5173" ||
      origin === "http://localhost:5174" ||
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

function getSuperAdminEmails() {
  return String(process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

async function resolveAdminUser(email, uid) {
  const superAdminEmails = getSuperAdminEmails();

  if (superAdminEmails.includes(email)) {
    if (isFirebaseAdminConfigured()) {
      await upsertAdminUser({
        email,
        role: "super_admin",
        invitedBy: email,
        active: true,
      });
    }

    return {
      email,
      uid,
      role: "super_admin",
      active: true,
    };
  }

  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  return getAdminUserByEmail(email);
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

  await recordAdminLogin(adminUser);
}

async function recordAuditLogSafe(payload) {
  if (!isFirebaseAdminConfigured()) {
    return;
  }

  await recordAuditLog(payload);
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

  return listAdminUsers();
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

async function sendConfirmationEmail({ courseTitle, customerName, email, downloadUrl }) {
  if (!email) {
    return { previewUrl: null };
  }

  const transporter = await createMailTransport();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "DWBB Academy <no-reply@dwbbacademy.com>",
    to: email,
    subject: `Your ${courseTitle} download is ready`,
    text: [
      `Hello ${customerName},`,
      "",
      `Thank you for purchasing ${courseTitle}.`,
      "Your payment was confirmed successfully.",
      "",
      `Download your course materials here: ${downloadUrl}`,
      `This download link expires in ${downloadLinkTtlDays} days.`,
      "",
      "If you need help, reply to this email or contact DWBB Academy.",
    ].join("\n"),
  });

  return {
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
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
  await fs.mkdir(path.dirname(purchasesFile), { recursive: true });
  await Promise.all([
    ensureJsonArrayFile(purchasesFile),
    ensureJsonArrayFile(attemptsFile),
    ensureJsonArrayFile(webhookEventsFile),
  ]);
}

async function readPurchases() {
  return readJsonFile(purchasesFile);
}

async function writePurchases(purchases) {
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
    console.error(`${context}: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return;
  }

  console.error(`${context}:`, error);
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
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function writeJsonFile(filePath, value) {
  await ensureDataFile();
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}
