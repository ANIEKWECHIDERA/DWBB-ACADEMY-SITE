export function createAdminService({
  adminLoginDedupTtlMs,
  adminUserCacheTtlMs,
  adminViewAuditDedupTtlMs,
  getAdminUserByEmail,
  getSuperAdminEmails,
  isFirebaseAdminConfigured,
  isFirestoreQuotaError,
  logServerError,
  listAdminUsers,
  listAuditLogs,
  listLoginLogs,
  listNotifications,
  normalizeEmail,
  recordAdminLogin,
}) {
  const adminUserCache = new Map();
  const adminActivityCache = new Map();
  const pendingAuditLogs = [];

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
      expiresAt: Date.now() + adminUserCacheTtlMs,
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

  async function authenticateAdminToken(
    token,
    {
      getFirebaseAdminAuth,
      superAdminOnly = false,
      requestLogger,
    } = {},
  ) {
    if (!token) {
      requestLogger?.warn("auth.admin.missing_token");
      throw new Error("Authentication required.");
    }

    const auth = getFirebaseAdminAuth?.();
    if (!auth) {
      requestLogger?.error("auth.admin.firebase_not_configured");
      throw new Error("Admin authentication is not configured.");
    }

    const decodedToken = await auth.verifyIdToken(token, true);
    const email = normalizeEmail(decodedToken.email);

    if (!email) {
      requestLogger?.warn("auth.admin.email_required", {
        uid: decodedToken.uid,
      });
      throw new Error("A verified email is required.");
    }

    const adminUser = await resolveAdminUser(email, decodedToken.uid);
    if (!adminUser || adminUser.active === false) {
      requestLogger?.warn("auth.admin.access_denied", {
        email,
        uid: decodedToken.uid,
      });
      throw new Error("You do not have access to this console.");
    }

    if (superAdminOnly && adminUser.role !== "super_admin") {
      requestLogger?.warn("auth.admin.super_admin_required", {
        email,
        uid: decodedToken.uid,
        role: adminUser.role,
      });
      throw new Error("Super admin access is required.");
    }

    requestLogger?.info("auth.admin.authenticated", {
      uid: decodedToken.uid,
      protected: adminUser.protected === true,
    });

    return {
      uid: decodedToken.uid,
      email,
      role: adminUser.role,
      active: adminUser.active !== false,
      protected: adminUser.protected === true,
    };
  }

  function requireAdminAuth({ getFirebaseAdminAuth, superAdminOnly } = {}) {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : "";
        req.adminUser = await authenticateAdminToken(token, {
          getFirebaseAdminAuth,
          requestLogger: req.requestLogger,
          superAdminOnly,
        });
        req.requestLogger = req.requestLogger?.child({
          actorEmail: req.adminUser.email,
          actorRole: req.adminUser.role,
        });

        next();
      } catch (error) {
        logServerError("Admin authentication failed", error);
        if (isFirestoreQuotaError(error)) {
          return res.status(503).json({
            error:
              "Firestore usage is temporarily exhausted. The admin console will be available again once quota resets or billing is increased.",
          });
        }
        if (error instanceof Error) {
          if (error.message === "Authentication required.") {
            return res.status(401).json({ error: error.message });
          }
          if (error.message === "Admin authentication is not configured.") {
            return res.status(503).json({ error: error.message });
          }
          if (
            error.message === "A verified email is required." ||
            error.message === "You do not have access to this console." ||
            error.message === "Super admin access is required."
          ) {
            return res.status(403).json({ error: error.message });
          }
        }
        res
          .status(401)
          .json({ error: "Unable to authenticate this admin session." });
      }
    };
  }

  async function recordAdminLoginSafe(adminUser) {
    if (!isFirebaseAdminConfigured()) {
      return;
    }

    if (
      shouldSkipAdminActivity(
        `login:${adminUser.uid || adminUser.email}`,
        adminLoginDedupTtlMs,
      )
    ) {
      return;
    }

    await recordAdminLogin(adminUser);
  }

  async function recordAuditLogSafe(payload) {
    if (
      String(payload?.action || "").endsWith(".viewed") &&
      shouldSkipAdminActivity(
        `audit:${payload.actorEmail || "system"}:${payload.action}:${payload.entityType}:${payload.entityId}`,
        adminViewAuditDedupTtlMs,
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
    const userMap = new Map(
      users.map((user) => [normalizeEmail(user.email), user]),
    );

    for (const email of getSuperAdminEmails()) {
      userMap.set(email, {
        ...(userMap.get(email) || { id: email, email }),
        email,
        role: "super_admin",
        active: true,
        protected: true,
      });
    }

    return Array.from(userMap.values()).sort((a, b) =>
      String(a.email || "").localeCompare(String(b.email || "")),
    );
  }

  async function listNotificationsSafe() {
    if (!isFirebaseAdminConfigured()) {
      return { notifications: [], unreadCount: 0 };
    }

    return listNotifications();
  }

  function mergeAuditLogsWithPending(persistedLogs = []) {
    return [...pendingAuditLogs, ...persistedLogs]
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
      )
      .slice(0, 100);
  }

  function getPendingAuditLogCount() {
    return pendingAuditLogs.length;
  }

  function drainPendingAuditLogs() {
    return pendingAuditLogs.splice(0, pendingAuditLogs.length);
  }

  function restorePendingAuditLogs(entries = []) {
    if (entries.length === 0) {
      return;
    }

    pendingAuditLogs.unshift(...entries);
  }

  return {
    clearCachedAdminUser,
    drainPendingAuditLogs,
    getPendingAuditLogCount,
    isProtectedSuperAdminEmail,
    listAdminUsersSafe,
    listAuditLogsSafe,
    listLoginLogsSafe,
    listNotificationsSafe,
    mergeAuditLogsWithPending,
    readCachedAdminUser,
    recordAdminLoginSafe,
    recordAuditLogSafe,
    authenticateAdminToken,
    requireAdminAuth,
    restorePendingAuditLogs,
    resolveAdminUser,
  };
}
