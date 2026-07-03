import crypto from "node:crypto";

import { WebSocketServer } from "ws";

import { childLogger } from "../logger.mjs";

export function createAdminRealtimeService({
  authenticateAdminToken,
  getFirebaseAdminAuth,
  getUnreadNotificationCount,
  isFirebaseAdminConfigured,
  logServerError,
}) {
  const clients = new Map();
  const websocketServer = new WebSocketServer({ noServer: true });

  websocketServer.on("connection", async (socket, request, clientInfo) => {
    clients.set(socket, clientInfo);

    const socketLogger = clientInfo.logger.child({
      actorEmail: clientInfo.adminUser.email,
      actorRole: clientInfo.adminUser.role,
      socketId: clientInfo.socketId,
    });

    socketLogger.info("admin_ws.connected", {
      channel: "admin_ws",
      connectedAt: clientInfo.connectedAt,
    });

    try {
      const unreadCount =
        isFirebaseAdminConfigured && getUnreadNotificationCount
          ? await getUnreadNotificationCount()
          : 0;
      sendEvent(socket, "notifications.snapshot_required", {
        reason: "connected",
        unreadCount,
      });
    } catch (error) {
      logServerError("Admin websocket snapshot failed", error);
    }

    socket.on("close", (code, reasonBuffer) => {
      clients.delete(socket);
      socketLogger.info("admin_ws.disconnected", {
        channel: "admin_ws",
        code,
        reason: reasonBuffer?.toString() || "",
      });
    });

    socket.on("error", (error) => {
      clients.delete(socket);
      logServerError("Admin websocket connection error", error);
    });

    socket.on("message", () => {
      socketLogger.debug("admin_ws.ignored_message", {
        channel: "admin_ws",
      });
    });
  });

  function attachToServer(server) {
    server.on("upgrade", async (request, socket, head) => {
      const url = new URL(request.url || "/", "http://localhost");
      if (url.pathname !== "/api/admin/realtime") {
        return;
      }

      const requestId = crypto.randomUUID();
      const requestLogger = childLogger({
        channel: "admin_ws",
        method: request.method || "GET",
        path: url.pathname,
        requestId,
      });

      requestLogger.info("admin_ws.connection_attempt", {
        ip: request.socket?.remoteAddress || "",
      });

      try {
        const token =
          url.searchParams.get("token") ||
          readBearerToken(request.headers.authorization || "");
        const adminUser = await authenticateAdminToken(token, {
          getFirebaseAdminAuth,
          requestLogger,
        });
        const socketId = crypto.randomUUID();

        websocketServer.handleUpgrade(request, socket, head, (ws) => {
          websocketServer.emit("connection", ws, request, {
            adminUser,
            connectedAt: new Date().toISOString(),
            logger: requestLogger,
            socketId,
          });
        });
      } catch (error) {
        requestLogger.warn("admin_ws.connection_rejected", {
          error: error instanceof Error ? error.message : String(error),
        });
        rejectUpgrade(socket, error);
      }
    });
  }

  async function broadcastNotificationCreated(notification) {
    const unreadCount = await safeUnreadCount();
    broadcast("notifications.created", {
      notification,
      unreadCount,
    });
  }

  async function broadcastNotificationUpdated(notification) {
    const unreadCount = await safeUnreadCount();
    broadcast("notifications.updated", {
      notification,
      unreadCount,
    });
  }

  async function broadcastNotificationDismissed(notificationId) {
    const unreadCount = await safeUnreadCount();
    broadcast("notifications.dismissed", {
      notificationId,
      unreadCount,
    });
  }

  async function broadcastNotificationsReadAll({ updatedAt }) {
    const unreadCount = await safeUnreadCount();
    broadcast("notifications.read_all", {
      unreadCount,
      updatedAt,
    });
  }

  async function safeUnreadCount() {
    if (!isFirebaseAdminConfigured || !getUnreadNotificationCount) {
      return 0;
    }

    try {
      return await getUnreadNotificationCount();
    } catch (error) {
      logServerError("Admin websocket unread count lookup failed", error);
      return null;
    }
  }

  function broadcast(type, payload) {
    const message = JSON.stringify({
      eventId: crypto.randomUUID(),
      payload,
      timestamp: new Date().toISOString(),
      type,
    });

    let broadcastCount = 0;

    for (const [socket, clientInfo] of clients.entries()) {
      if (socket.readyState !== 1) {
        continue;
      }

      try {
        socket.send(message);
        broadcastCount += 1;
      } catch (error) {
        clientInfo.logger.warn("admin_ws.broadcast_failed", {
          actorEmail: clientInfo.adminUser.email,
          actorRole: clientInfo.adminUser.role,
          channel: "admin_ws",
          eventType: type,
          socketId: clientInfo.socketId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    childLogger({
      broadcastCount,
      channel: "admin_ws",
      eventType: type,
    }).info("admin_ws.broadcast_completed");
  }

  return {
    attachToServer,
    broadcastNotificationCreated,
    broadcastNotificationDismissed,
    broadcastNotificationsReadAll,
    broadcastNotificationUpdated,
  };
}

function sendEvent(socket, type, payload) {
  socket.send(
    JSON.stringify({
      eventId: crypto.randomUUID(),
      payload,
      timestamp: new Date().toISOString(),
      type,
    }),
  );
}

function readBearerToken(authorizationHeader) {
  return authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : "";
}

function rejectUpgrade(socket, error) {
  const statusCode =
    error instanceof Error && error.message === "Admin authentication is not configured."
      ? 503
      : error instanceof Error && error.message === "Authentication required."
        ? 401
        : 403;
  const body = JSON.stringify({
    error:
      error instanceof Error
        ? error.message
        : "Unable to authenticate this admin session.",
  });

  socket.write(
    [
      `HTTP/1.1 ${statusCode} ${getStatusText(statusCode)}`,
      "Connection: close",
      "Content-Type: application/json; charset=utf-8",
      `Content-Length: ${Buffer.byteLength(body)}`,
      "",
      body,
    ].join("\r\n"),
  );
  socket.destroy();
}

function getStatusText(statusCode) {
  if (statusCode === 401) {
    return "Unauthorized";
  }
  if (statusCode === 503) {
    return "Service Unavailable";
  }
  return "Forbidden";
}
