export function registerAdminRoutes(
  app,
  {
    adminService,
    courseService,
    deleteAdminUserByEmail,
    deleteCustomersByEmail,
    deleteManagedCourse,
    deleteTransactionsByReference,
    dismissNotification,
    ensureManagedCoursesSeeded,
    getDashboardMetrics,
    httpService,
    isFirebaseAdminConfigured,
    isFirestoreQuotaError,
    logServerError,
    markAllNotificationsRead,
    normalizeEmail,
    paymentService,
    recordAuditLogsBatch,
    reorderManagedCourses,
    replaceManagedCourseAsset,
    clearManagedCourseAssets,
    requireAdminAuth,
    listCustomers,
    listTransactions,
    updateManagedCourse,
    updateNotificationStatus,
    upsertAdminUser,
    getSuperAdminEmails,
  },
) {
  app.get("/api/admin/session", requireAdminAuth(), async (req, res) => {
    const { adminUser } = req;

    if (isFirebaseAdminConfigured()) {
      await ensureManagedCoursesSeeded();
    }

    await adminService.recordAdminLoginSafe(adminUser);
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
      mode: paymentService.getPaystackMode(),
      firebaseEnabled: isFirebaseAdminConfigured(),
    });
  });

  app.get("/api/admin/dashboard", requireAdminAuth(), async (req, res) => {
    const range = httpService.parseDashboardRange(req.query.range);
    const metrics = await getDashboardMetrics(range);
    if (!httpService.shouldSkipAdminAuditLog(req)) {
      await adminService.recordAuditLogSafe({
        actorEmail: req.adminUser.email,
        actorRole: req.adminUser.role,
        action: "dashboard.viewed",
        entityType: "dashboard",
        entityId: "overview",
        metadata: { range },
      });
    }
    res.json({
      mode: paymentService.getPaystackMode(),
      range,
      metrics,
    });
  });

  app.get("/api/admin/courses", requireAdminAuth(), async (_req, res) => {
    const courses = await courseService.listManagedCoursesSafe();
    res.json({ courses });
  });

  app.put("/api/admin/courses/:slug", requireAdminAuth(), async (req, res) => {
    const slug = req.params.slug;
    const updates = courseService.sanitizeCourseUpdates(req.body ?? {});
    const course = await updateManagedCourse(slug, updates, req.adminUser);

    await adminService.recordAuditLogSafe({
      actorEmail: req.adminUser.email,
      actorRole: req.adminUser.role,
      action: "course.updated",
      entityType: "course",
      entityId: slug,
      metadata: { fields: Object.keys(updates) },
    });

    res.json({ course });
  });

  app.post(
    "/api/admin/courses/reorder",
    requireAdminAuth(),
    async (req, res) => {
      const slugs = Array.isArray(req.body?.slugs)
        ? req.body.slugs.filter(Boolean)
        : [];

      if (slugs.length === 0) {
        return res.status(400).json({ error: "Course order is required." });
      }

      const courses = await reorderManagedCourses(slugs, req.adminUser);
      await adminService.recordAuditLogSafe({
        actorEmail: req.adminUser.email,
        actorRole: req.adminUser.role,
        action: "course.reordered",
        entityType: "course",
        entityId: "catalog",
        metadata: { slugs },
      });

      res.json({ courses });
    },
  );

  app.delete(
    "/api/admin/courses/:slug",
    requireAdminAuth(),
    async (req, res) => {
      const slug = req.params.slug;
      await deleteManagedCourse(slug);
      await adminService.recordAuditLogSafe({
        actorEmail: req.adminUser.email,
        actorRole: req.adminUser.role,
        action: "course.deleted",
        entityType: "course",
        entityId: slug,
        metadata: {},
      });
      res.status(204).end();
    },
  );

  app.post(
    "/api/admin/courses/:slug/asset",
    requireAdminAuth(),
    async (req, res) => {
      const slug = req.params.slug;
      const dataUri =
        typeof req.body?.dataUri === "string" ? req.body.dataUri : "";
      const fileName =
        typeof req.body?.fileName === "string" ? req.body.fileName.trim() : "";

      if (!dataUri || !fileName) {
        return res.status(400).json({ error: "A valid file is required." });
      }

      try {
        const course = await replaceManagedCourseAsset(slug, {
          actor: req.adminUser,
          dataUri,
          fileName: paymentService.sanitizeAssetFileName(fileName),
        });

        await adminService.recordAuditLogSafe({
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
        res
          .status(500)
          .json({ error: "Unable to upload course file right now." });
      }
    },
  );

  app.delete(
    "/api/admin/courses/:slug/asset",
    requireAdminAuth(),
    async (req, res) => {
      const slug = req.params.slug;

      try {
        const course = await clearManagedCourseAssets(slug, req.adminUser);
        await adminService.recordAuditLogSafe({
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
        res
          .status(500)
          .json({ error: "Unable to remove course file right now." });
      }
    },
  );

  app.get(
    "/api/admin/transactions",
    requireAdminAuth({ superAdminOnly: true }),
    async (req, res) => {
      const range = httpService.parseDashboardRange(req.query.range);
      const transactions = await listTransactions(range);
      if (!httpService.shouldSkipAdminAuditLog(req)) {
        await adminService.recordAuditLogSafe({
          actorEmail: req.adminUser.email,
          actorRole: req.adminUser.role,
          action: "transactions.viewed",
          entityType: "transaction",
          entityId: "collection",
          metadata: { range },
        });
      }
      res.json({ transactions });
    },
  );

  app.delete(
    "/api/admin/transactions",
    requireAdminAuth({ superAdminOnly: true }),
    async (req, res) => {
      const references = Array.isArray(req.body?.references)
        ? req.body.references.filter(Boolean)
        : [];

      if (references.length === 0) {
        return res
          .status(400)
          .json({ error: "At least one transaction reference is required." });
      }

      await deleteTransactionsByReference(references);
      await adminService.recordAuditLogSafe({
        actorEmail: req.adminUser.email,
        actorRole: req.adminUser.role,
        action: "transactions.deleted",
        entityType: "transaction",
        entityId: "collection",
        metadata: { references },
      });
      res.status(204).end();
    },
  );

  app.get(
    "/api/admin/customers",
    requireAdminAuth({ superAdminOnly: true }),
    async (req, res) => {
      const range = httpService.parseDashboardRange(req.query.range);
      const customers = await listCustomers(range);
      if (!httpService.shouldSkipAdminAuditLog(req)) {
        await adminService.recordAuditLogSafe({
          actorEmail: req.adminUser.email,
          actorRole: req.adminUser.role,
          action: "customers.viewed",
          entityType: "customer",
          entityId: "collection",
          metadata: { range },
        });
      }
      res.json({ customers });
    },
  );

  app.delete(
    "/api/admin/customers",
    requireAdminAuth({ superAdminOnly: true }),
    async (req, res) => {
      const emails = Array.isArray(req.body?.emails)
        ? req.body.emails.filter(Boolean)
        : [];

      if (emails.length === 0) {
        return res
          .status(400)
          .json({ error: "At least one customer email is required." });
      }

      await deleteCustomersByEmail(emails);
      await adminService.recordAuditLogSafe({
        actorEmail: req.adminUser.email,
        actorRole: req.adminUser.role,
        action: "customers.deleted",
        entityType: "customer",
        entityId: "collection",
        metadata: { emails },
      });
      res.status(204).end();
    },
  );

  app.get("/api/admin/notifications", requireAdminAuth(), async (req, res) => {
    const payload = await adminService.listNotificationsSafe();
    if (!httpService.shouldSkipAdminAuditLog(req)) {
      await adminService.recordAuditLogSafe({
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

  app.post(
    "/api/admin/notifications/load",
    requireAdminAuth(),
    async (req, res) => {
      const payload = await adminService.listNotificationsSafe();
      req.requestLogger?.info("admin.notifications.loaded", {
        actorEmail: req.adminUser.email,
        actorRole: req.adminUser.role,
        unreadCount: payload.unreadCount,
      });
      res.json(payload);
    },
  );

  app.patch(
    "/api/admin/notifications/:id",
    requireAdminAuth(),
    async (req, res) => {
      const status = req.body?.status;

      if (status !== "read" && status !== "unread") {
        return res
          .status(400)
          .json({ error: "A valid notification status is required." });
      }

      const notification = await updateNotificationStatus(req.params.id, status);
      await adminService.recordAuditLogSafe({
        actorEmail: req.adminUser.email,
        actorRole: req.adminUser.role,
        action: `notification.${status}`,
        entityType: "notification",
        entityId: req.params.id,
        metadata: {},
      });
      res.json({ notification });
    },
  );

  app.post(
    "/api/admin/notifications/mark-all-read",
    requireAdminAuth(),
    async (req, res) => {
      const updatedCount = await markAllNotificationsRead();
      await adminService.recordAuditLogSafe({
        actorEmail: req.adminUser.email,
        actorRole: req.adminUser.role,
        action: "notifications.mark_all_read",
        entityType: "notification",
        entityId: "collection",
        metadata: { updatedCount },
      });
      res.json({ updatedCount });
    },
  );

  app.delete(
    "/api/admin/notifications/:id",
    requireAdminAuth(),
    async (req, res) => {
      await dismissNotification(req.params.id);
      await adminService.recordAuditLogSafe({
        actorEmail: req.adminUser.email,
        actorRole: req.adminUser.role,
        action: "notification.dismissed",
        entityType: "notification",
        entityId: req.params.id,
        metadata: {},
      });
      res.status(204).end();
    },
  );

  app.get(
    "/api/admin/audit-logs",
    requireAdminAuth({ superAdminOnly: true }),
    async (req, res) => {
      const [auditLogs, loginLogs] = await Promise.all([
        adminService.listAuditLogsSafe(),
        adminService.listLoginLogsSafe(),
      ]);
      if (!httpService.shouldSkipAdminAuditLog(req)) {
        await adminService.recordAuditLogSafe({
          actorEmail: req.adminUser.email,
          actorRole: req.adminUser.role,
          action: "audit_logs.viewed",
          entityType: "audit_log",
          entityId: "collection",
          metadata: {},
        });
      }
      res.json({
        auditLogs: adminService.mergeAuditLogsWithPending(auditLogs),
        loginLogs,
        pendingAuditLogCount: adminService.getPendingAuditLogCount(),
      });
    },
  );

  app.post(
    "/api/admin/audit-logs/sync",
    requireAdminAuth({ superAdminOnly: true }),
    async (req, res) => {
      if (!isFirebaseAdminConfigured()) {
        return res.json({
          syncedCount: 0,
          pendingAuditLogCount: adminService.getPendingAuditLogCount(),
        });
      }

      if (adminService.getPendingAuditLogCount() === 0) {
        return res.json({ syncedCount: 0, pendingAuditLogCount: 0 });
      }

      const queueSnapshot = adminService.drainPendingAuditLogs();

      try {
        const syncedCount = await recordAuditLogsBatch(queueSnapshot);
        req.requestLogger?.info("admin.audit_logs.synced", {
          actorEmail: req.adminUser.email,
          actorRole: req.adminUser.role,
          syncedCount,
          pendingAuditLogCount: adminService.getPendingAuditLogCount(),
        });
        res.json({
          syncedCount,
          pendingAuditLogCount: adminService.getPendingAuditLogCount(),
        });
      } catch (error) {
        adminService.restorePendingAuditLogs(queueSnapshot);
        logServerError("Audit log sync failed", error);

        if (isFirestoreQuotaError(error)) {
          return res.status(503).json({
            error:
              "Firestore usage is temporarily exhausted. Try syncing audit logs again later.",
          });
        }

        res.status(500).json({ error: "Unable to sync audit logs right now." });
      }
    },
  );

  app.get(
    "/api/admin/users",
    requireAdminAuth({ superAdminOnly: true }),
    async (_req, res) => {
      const users = await adminService.listAdminUsersSafe();
      res.json({ users });
    },
  );

  app.put(
    "/api/admin/users/:email",
    requireAdminAuth({ superAdminOnly: true }),
    async (req, res) => {
      const email = normalizeEmail(req.params.email);
      const role = req.body?.role;

      if (role !== "admin" && role !== "super_admin") {
        return res.status(400).json({ error: "A valid role is required." });
      }

      if (!email) {
        return res
          .status(400)
          .json({ error: "A valid admin email is required." });
      }

      if (email === normalizeEmail(req.adminUser.email)) {
        return res.status(400).json({
          error: "You cannot change your own admin access from the console.",
        });
      }

      if (adminService.isProtectedSuperAdminEmail(email)) {
        return res.status(400).json({
          error:
            "Primary super admin access is protected and cannot be changed here.",
        });
      }

      const user = await upsertAdminUser({
        email,
        role,
        invitedBy: req.adminUser.email,
        active: req.body?.active !== false,
      });
      adminService.clearCachedAdminUser(email);

      await adminService.recordAuditLogSafe({
        actorEmail: req.adminUser.email,
        actorRole: req.adminUser.role,
        action: "admin.role.updated",
        entityType: "admin_user",
        entityId: normalizeEmail(email),
        metadata: { role, active: req.body?.active !== false },
      });

      res.json({ user });
    },
  );

  app.delete(
    "/api/admin/users/:email",
    requireAdminAuth({ superAdminOnly: true }),
    async (req, res) => {
      const email = normalizeEmail(req.params.email);

      if (!email) {
        return res
          .status(400)
          .json({ error: "A valid admin email is required." });
      }

      if (email === normalizeEmail(req.adminUser.email)) {
        return res
          .status(400)
          .json({ error: "You cannot delete your own admin access." });
      }

      if (getSuperAdminEmails().includes(email)) {
        return res.status(400).json({
          error: "Primary super admin access cannot be deleted here.",
        });
      }

      await deleteAdminUserByEmail(email);
      adminService.clearCachedAdminUser(email);

      await adminService.recordAuditLogSafe({
        actorEmail: req.adminUser.email,
        actorRole: req.adminUser.role,
        action: "admin.deleted",
        entityType: "admin_user",
        entityId: email,
        metadata: {},
      });

      res.status(204).end();
    },
  );

  app.post("/api/admin/client-events", requireAdminAuth(), async (req, res) => {
    const event =
      typeof req.body?.event === "string" ? req.body.event.trim() : "";
    const metadata =
      req.body?.metadata && typeof req.body.metadata === "object"
        ? req.body.metadata
        : {};
    const allowedEvents = new Set([
      "admin.console.loaded",
      "admin.console.refreshed",
      "admin.logout.initiated",
      "admin.notifications.opened",
      "admin.section.changed",
    ]);

    if (!allowedEvents.has(event)) {
      return res
        .status(400)
        .json({ error: "A valid client event is required." });
    }

    req.requestLogger?.info("admin.client_event", {
      actorEmail: req.adminUser.email,
      actorRole: req.adminUser.role,
      event,
      metadata,
    });

    res.json({ ok: true });
  });
}
