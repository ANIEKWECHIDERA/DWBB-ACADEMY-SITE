import crypto from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { getCheckoutPricing } from "../src/lib/paystackPricing.js";
import { destroyCloudinaryAssets, uploadCourseAsset } from "./cloudinary.mjs";
import { digitalCourseCatalog } from "./course-catalog.mjs";
import { getFirebaseAdminFirestore } from "./firebase-admin.mjs";

const COLLECTIONS = {
  adminUsers: "admin_users",
  auditLogs: "audit_logs",
  courses: "courses",
  customers: "customers",
  loginLogs: "admin_logins",
  notifications: "notifications",
  transactions: "transactions",
};

let managedCoursesSeededInProcess = false;

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function firestoreRequired() {
  const firestore = getFirebaseAdminFirestore();

  if (!firestore) {
    throw new Error("Firebase Admin is not configured.");
  }

  return firestore;
}

function fallbackCourseDocument(course, index) {
  const pricing = getCheckoutPricing(course.priceNaira);

  return {
    templateSlug: course.slug,
    slug: course.slug,
    title: course.title,
    shortTitle: course.title.replace(/\s+Bootcamp$/i, ""),
    summary: "",
    longDescription: "",
    deliverables: course.deliverables,
    priceNaira: course.priceNaira,
    checkoutPriceNaira: pricing.totalChargeNaira,
    processingFeeNaira: pricing.processingFeeNaira,
    published: true,
    featured: true,
    order: index,
    assets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function ensureManagedCoursesSeeded() {
  if (managedCoursesSeededInProcess) {
    return;
  }

  const firestore = firestoreRequired();
  const snapshot = await firestore.collection(COLLECTIONS.courses).limit(1).get();

  if (!snapshot.empty) {
    managedCoursesSeededInProcess = true;
    return;
  }

  const batch = firestore.batch();

  digitalCourseCatalog.forEach((course, index) => {
    const ref = firestore.collection(COLLECTIONS.courses).doc(course.slug);
    batch.set(ref, fallbackCourseDocument(course, index));
  });

  await batch.commit();
  managedCoursesSeededInProcess = true;
}

export async function listManagedCourses() {
  const firestore = firestoreRequired();
  await ensureManagedCoursesSeeded();
  const snapshot = await firestore.collection(COLLECTIONS.courses).orderBy("order", "asc").get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function getManagedCourse(slug) {
  const firestore = firestoreRequired();
  await ensureManagedCoursesSeeded();
  const doc = await firestore.collection(COLLECTIONS.courses).doc(slug).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function updateManagedCourse(slug, updates, actor) {
  const firestore = firestoreRequired();
  const nextSlug = updates.slug && updates.slug !== slug ? updates.slug : slug;
  const pricing = updates.priceNaira ? getCheckoutPricing(Number(updates.priceNaira)) : null;
  const patch = {
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.email,
  };

  if (pricing) {
    patch.checkoutPriceNaira = pricing.totalChargeNaira;
    patch.processingFeeNaira = pricing.processingFeeNaira;
  }

  if (nextSlug !== slug) {
    const current = await getManagedCourse(slug);
    const currentData = current ? { ...current } : {};
    delete currentData.id;
    const nextRef = firestore.collection(COLLECTIONS.courses).doc(nextSlug);

    await nextRef.set(
      {
        ...currentData,
        ...patch,
        slug: nextSlug,
        templateSlug: current?.templateSlug || current?.slug || slug,
      },
      { merge: false },
    );

    await firestore.collection(COLLECTIONS.courses).doc(slug).delete();
    return getManagedCourse(nextSlug);
  }

  await firestore.collection(COLLECTIONS.courses).doc(slug).set(patch, { merge: true });
  return getManagedCourse(slug);
}

export async function reorderManagedCourses(slugs, actor) {
  const firestore = firestoreRequired();
  const batch = firestore.batch();

  slugs.forEach((slug, index) => {
    const ref = firestore.collection(COLLECTIONS.courses).doc(slug);
    batch.set(
      ref,
      {
        order: index,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.email,
      },
      { merge: true },
    );
  });

  await batch.commit();
  return listManagedCourses();
}

export async function deleteManagedCourse(slug) {
  const firestore = firestoreRequired();
  const existing = await getManagedCourse(slug);
  const publicIds = Array.isArray(existing?.assets)
    ? existing.assets.map((asset) => asset?.publicId).filter(Boolean)
    : [];

  await destroyCloudinaryAssets(publicIds);
  await firestore.collection(COLLECTIONS.courses).doc(slug).delete();
}

export async function replaceManagedCourseAsset(slug, { actor, dataUri, fileName }) {
  const firestore = firestoreRequired();
  const course = await getManagedCourse(slug);

  if (!course) {
    throw new Error("Course not found.");
  }

  const existingPublicIds = Array.isArray(course.assets)
    ? course.assets.map((asset) => asset?.publicId).filter(Boolean)
    : [];

  const nextAsset = await uploadCourseAsset({
    courseTitle: course.title,
    dataUri,
    fileName,
  });

  if (existingPublicIds.length > 0) {
    await destroyCloudinaryAssets(existingPublicIds);
  }

  await firestore.collection(COLLECTIONS.courses).doc(slug).set(
    {
      assets: [nextAsset],
      updatedAt: new Date().toISOString(),
      updatedBy: actor.email,
    },
    { merge: true },
  );

  return getManagedCourse(slug);
}

export async function clearManagedCourseAssets(slug, actor) {
  const firestore = firestoreRequired();
  const course = await getManagedCourse(slug);

  if (!course) {
    throw new Error("Course not found.");
  }

  const existingPublicIds = Array.isArray(course.assets)
    ? course.assets.map((asset) => asset?.publicId).filter(Boolean)
    : [];

  if (existingPublicIds.length > 0) {
    await destroyCloudinaryAssets(existingPublicIds);
  }

  await firestore.collection(COLLECTIONS.courses).doc(slug).set(
    {
      assets: [],
      updatedAt: new Date().toISOString(),
      updatedBy: actor.email,
    },
    { merge: true },
  );

  return getManagedCourse(slug);
}

export async function getAdminUserByEmail(email) {
  const firestore = firestoreRequired();
  const normalizedEmail = normalizeEmail(email);
  const doc = await firestore.collection(COLLECTIONS.adminUsers).doc(normalizedEmail).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function listAdminUsers() {
  const firestore = firestoreRequired();
  const snapshot = await firestore.collection(COLLECTIONS.adminUsers).orderBy("email", "asc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function upsertAdminUser({ email, role, invitedBy, active = true }) {
  const firestore = firestoreRequired();
  const normalizedEmail = normalizeEmail(email);
  const ref = firestore.collection(COLLECTIONS.adminUsers).doc(normalizedEmail);

  await ref.set(
    {
      email: normalizedEmail,
      role,
      active,
      invitedBy,
      updatedAt: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return getAdminUserByEmail(normalizedEmail);
}

export async function deleteAdminUserByEmail(email) {
  const firestore = firestoreRequired();
  const normalizedEmail = normalizeEmail(email);

  await firestore.collection(COLLECTIONS.adminUsers).doc(normalizedEmail).delete();
}

export async function recordAdminLogin({ email, role, uid }) {
  const firestore = firestoreRequired();
  await firestore.collection(COLLECTIONS.loginLogs).add({
    email,
    role,
    uid,
    createdAt: new Date().toISOString(),
  });
}

export async function recordAuditLog({ actorEmail, actorRole, action, entityType, entityId, metadata }) {
  const firestore = firestoreRequired();
  await firestore.collection(COLLECTIONS.auditLogs).add({
    actorEmail,
    actorRole,
    action,
    entityType,
    entityId,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
  });
}

export async function recordAuditLogsBatch(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return 0;
  }

  const firestore = firestoreRequired();
  const batch = firestore.batch();

  entries.forEach((entry) => {
    const ref = firestore.collection(COLLECTIONS.auditLogs).doc();
    batch.set(ref, {
      actorEmail: entry.actorEmail || "",
      actorRole: entry.actorRole || "",
      action: entry.action || "",
      entityType: entry.entityType || "",
      entityId: entry.entityId || "",
      metadata: entry.metadata || {},
      createdAt: entry.createdAt || new Date().toISOString(),
    });
  });

  await batch.commit();
  return entries.length;
}

export async function listAuditLogs(limit = 100) {
  const firestore = firestoreRequired();
  const snapshot = await firestore.collection(COLLECTIONS.auditLogs).orderBy("createdAt", "desc").limit(limit).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function listLoginLogs(limit = 100) {
  const firestore = firestoreRequired();
  const snapshot = await firestore.collection(COLLECTIONS.loginLogs).orderBy("createdAt", "desc").limit(limit).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function listNotifications(limit = 100) {
  const firestore = firestoreRequired();
  const snapshot = await firestore
    .collection(COLLECTIONS.notifications)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const notifications = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((item) => !item.dismissedAt);

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.readAt).length,
  };
}

export async function updateNotificationStatus(id, status) {
  const firestore = firestoreRequired();
  const ref = firestore.collection(COLLECTIONS.notifications).doc(id);

  await ref.set(
    {
      readAt: status === "read" ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  const doc = await ref.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function dismissNotification(id) {
  const firestore = firestoreRequired();
  await firestore.collection(COLLECTIONS.notifications).doc(id).set(
    {
      dismissedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function markAllNotificationsRead() {
  const firestore = firestoreRequired();
  const snapshot = await firestore.collection(COLLECTIONS.notifications).where("readAt", "==", null).get();
  const batch = firestore.batch();

  snapshot.docs.forEach((doc) => {
    batch.set(
      doc.ref,
      {
        readAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  });

  await batch.commit();
  return snapshot.size;
}

export async function mirrorVerifiedPurchase({ purchase, transaction, course }) {
  const firestore = firestoreRequired();
  const normalizedEmail = normalizeEmail(purchase.email);
  const transactionRef = firestore.collection(COLLECTIONS.transactions).doc(purchase.reference);
  const customerRef = normalizedEmail ? firestore.collection(COLLECTIONS.customers).doc(normalizedEmail) : null;
  const notificationRef = firestore.collection(COLLECTIONS.notifications).doc(purchase.reference);

  const transactionPayload = {
    amountKobo: purchase.amount,
    chargedAmountKobo: purchase.chargedAmountKobo,
    coursePriceKobo: purchase.coursePriceKobo,
    processingFeeKobo: purchase.processingFeeKobo,
    courseSlug: purchase.courseSlug,
    courseTitle: purchase.courseTitle,
    customerEmail: normalizedEmail,
    customerName: purchase.name,
    customerPhone: purchase.phone || "",
    paidAt: purchase.paidAt,
    paymentChannel: transaction.channel || transaction.authorization?.channel || "",
    paymentMethod: transaction.authorization?.card_type || transaction.authorization?.brand || transaction.channel || "",
    status: transaction.status,
    reference: purchase.reference,
    source: "paystack",
    updatedAt: new Date().toISOString(),
  };

  await transactionRef.set(transactionPayload, { merge: true });
  await notificationRef.set(
    {
      kind: "purchase",
      title: "New purchase received",
      message: `${purchase.name} purchased ${purchase.courseTitle}.`,
      courseSlug: purchase.courseSlug,
      courseTitle: purchase.courseTitle,
      customerName: purchase.name,
      customerEmail: normalizedEmail,
      transactionReference: purchase.reference,
      amountKobo: Number(transaction.amount),
      createdAt: purchase.paidAt,
      readAt: null,
      dismissedAt: null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  if (customerRef) {
    const customerDoc = await customerRef.get();
    const existing = customerDoc.exists ? customerDoc.data() : null;
    const courses = new Set([...(existing?.courses || []), purchase.courseSlug]);

    await customerRef.set(
      {
        email: normalizedEmail,
        name: purchase.name,
        phone: purchase.phone || "",
        lastPurchaseAt: purchase.paidAt,
        totalGrossKobo: (existing?.totalGrossKobo || 0) + purchase.amount,
        totalNetKobo: (existing?.totalNetKobo || 0) + purchase.coursePriceKobo,
        totalTransactions: (existing?.totalTransactions || 0) + 1,
        courses: Array.from(courses),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  return transactionPayload;
}

function getRangeStart(range) {
  const now = new Date();
  const start = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === "7d") {
    start.setDate(start.getDate() - 7);
    return start;
  }

  if (range === "30d") {
    start.setDate(start.getDate() - 30);
    return start;
  }

  return null;
}

export async function listTransactions(range = "all") {
  const firestore = firestoreRequired();
  let query = firestore.collection(COLLECTIONS.transactions).orderBy("paidAt", "desc");
  const start = getRangeStart(range);

  if (start) {
    query = query.where("paidAt", ">=", start.toISOString());
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function listCustomers(range = "all") {
  const firestore = firestoreRequired();
  let query = firestore.collection(COLLECTIONS.customers).orderBy("lastPurchaseAt", "desc");
  const start = getRangeStart(range);

  if (start) {
    query = query.where("lastPurchaseAt", ">=", start.toISOString());
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getDashboardMetrics(range = "all") {
  const transactions = await listTransactions(range);
  const grossSalesKobo = transactions.reduce((sum, item) => sum + (item.chargedAmountKobo || item.amountKobo || 0), 0);
  const netInflowKobo = transactions.reduce((sum, item) => sum + (item.coursePriceKobo || 0), 0);
  const totalTransactions = transactions.length;
  const courseSales = new Map();
  const inflowTimeline = new Map();

  transactions.forEach((item) => {
    const salesEntry = courseSales.get(item.courseTitle) || { courseTitle: item.courseTitle, transactions: 0, grossSalesKobo: 0, netInflowKobo: 0 };
    salesEntry.transactions += 1;
    salesEntry.grossSalesKobo += item.chargedAmountKobo || item.amountKobo || 0;
    salesEntry.netInflowKobo += item.coursePriceKobo || 0;
    courseSales.set(item.courseTitle, salesEntry);

    const dayKey = String(item.paidAt || "").slice(0, 10);
    const inflowEntry = inflowTimeline.get(dayKey) || { date: dayKey, grossSalesKobo: 0, netInflowKobo: 0, transactions: 0 };
    inflowEntry.grossSalesKobo += item.chargedAmountKobo || item.amountKobo || 0;
    inflowEntry.netInflowKobo += item.coursePriceKobo || 0;
    inflowEntry.transactions += 1;
    inflowTimeline.set(dayKey, inflowEntry);
  });

  const topSellingCourse = Array.from(courseSales.values()).sort((a, b) => b.transactions - a.transactions)[0] || null;

  return {
    grossSalesKobo,
    netInflowKobo,
    totalTransactions,
    topSellingCourse,
    salesByCourse: Array.from(courseSales.values()).sort((a, b) => b.transactions - a.transactions),
    inflowOverTime: Array.from(inflowTimeline.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function generateAuditEntityId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

export async function deleteTransactionsByReference(references = []) {
  const firestore = firestoreRequired();
  const uniqueReferences = Array.from(new Set(references.filter(Boolean)));
  const impactedCustomers = new Set();
  const batch = firestore.batch();

  for (const reference of uniqueReferences) {
    const ref = firestore.collection(COLLECTIONS.transactions).doc(reference);
    const doc = await ref.get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.customerEmail) {
        impactedCustomers.add(normalizeEmail(data.customerEmail));
      }
      batch.delete(ref);
    }
  }

  await batch.commit();

  for (const email of impactedCustomers) {
    await rebuildCustomerFromTransactions(email);
  }
}

export async function deleteCustomersByEmail(emails = []) {
  const firestore = firestoreRequired();
  const uniqueEmails = Array.from(new Set(emails.map((email) => normalizeEmail(email)).filter(Boolean)));
  const batch = firestore.batch();

  for (const email of uniqueEmails) {
    batch.delete(firestore.collection(COLLECTIONS.customers).doc(email));
  }

  await batch.commit();
}

async function rebuildCustomerFromTransactions(email) {
  const firestore = firestoreRequired();
  const normalizedEmail = normalizeEmail(email);
  const snapshot = await firestore.collection(COLLECTIONS.transactions).where("customerEmail", "==", normalizedEmail).get();
  const customerRef = firestore.collection(COLLECTIONS.customers).doc(normalizedEmail);

  if (snapshot.empty) {
    await customerRef.delete();
    return;
  }

  const aggregate = {
    email: normalizedEmail,
    name: "",
    phone: "",
    totalGrossKobo: 0,
    totalNetKobo: 0,
    totalTransactions: 0,
    lastPurchaseAt: "",
    courses: new Set(),
    updatedAt: new Date().toISOString(),
  };

  snapshot.docs.forEach((doc) => {
    const transaction = doc.data();
    aggregate.name = aggregate.name || transaction.customerName || "";
    aggregate.phone = aggregate.phone || transaction.customerPhone || "";
    aggregate.totalGrossKobo += transaction.chargedAmountKobo || transaction.amountKobo || 0;
    aggregate.totalNetKobo += transaction.coursePriceKobo || 0;
    aggregate.totalTransactions += 1;
    aggregate.lastPurchaseAt = transaction.paidAt > aggregate.lastPurchaseAt ? transaction.paidAt : aggregate.lastPurchaseAt;
    if (transaction.courseSlug) {
      aggregate.courses.add(transaction.courseSlug);
    }
  });

  await customerRef.set(
    {
      email: aggregate.email,
      name: aggregate.name,
      phone: aggregate.phone,
      totalGrossKobo: aggregate.totalGrossKobo,
      totalNetKobo: aggregate.totalNetKobo,
      totalTransactions: aggregate.totalTransactions,
      lastPurchaseAt: aggregate.lastPurchaseAt,
      courses: Array.from(aggregate.courses),
      updatedAt: aggregate.updatedAt,
    },
    { merge: true },
  );
}
