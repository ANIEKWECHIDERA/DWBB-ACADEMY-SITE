import dotenv from "dotenv";
import WebSocket from "ws";

import { getFirebaseAdminAuth } from "../server/firebase-admin.mjs";
import { createMailer } from "../server/services/mailer.mjs";

dotenv.config();

const serverBaseUrl = process.env.DEV_SERVER_BASE_URL || `http://localhost:${process.env.PORT || process.env.SERVER_PORT || 8787}`;
const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY;
const superAdminEmail = String(process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)[0];

const report = {
  generatedAt: new Date().toISOString(),
  serverBaseUrl,
  smtp: null,
  adminConnection: null,
};

report.smtp = await checkSmtpConnectivity();
report.adminConnection = await checkAdminConnection();

console.log(JSON.stringify(report, null, 2));

async function checkSmtpConnectivity() {
  const startedAt = Date.now();
  const mailer = createMailer({
    appBaseUrl: process.env.APP_BASE_URL || "http://localhost:5173",
    downloadLinkTtlDays: Number(process.env.DOWNLOAD_LINK_TTL_DAYS || 7),
  });

  try {
    const result = await mailer.verifyConnection();
    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      ...result,
    };
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      error: normalizeError(error),
    };
  }
}

async function checkAdminConnection() {
  const startedAt = Date.now();

  if (!firebaseApiKey || !superAdminEmail) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      error: "Missing Firebase API key or SUPER_ADMIN_EMAILS for the admin connectivity check.",
    };
  }

  const auth = getFirebaseAdminAuth();
  if (!auth) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      error: "Firebase Admin authentication is not configured.",
    };
  }

  try {
    const customToken = await auth.createCustomToken("dev-admin-ws-check", {
      email: superAdminEmail,
      email_verified: true,
    });

    const signInResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: customToken,
          returnSecureToken: true,
        }),
      },
    );
    const signInPayload = await signInResponse.json();

    if (!signInResponse.ok || !signInPayload.idToken) {
      return {
        ok: false,
        durationMs: Date.now() - startedAt,
        sessionStatus: signInResponse.status,
        error:
          signInPayload?.error?.message ||
          signInPayload?.message ||
          "Unable to exchange a Firebase custom token for an ID token.",
      };
    }

    const idToken = signInPayload.idToken;
    const sessionResponse = await fetch(`${serverBaseUrl}/api/admin/session`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    const sessionPayload = await sessionResponse.json();

    const websocketUrl = new URL("/api/admin/realtime", serverBaseUrl);
    websocketUrl.protocol =
      websocketUrl.protocol === "https:" ? "wss:" : "ws:";
    websocketUrl.searchParams.set("token", idToken);

    const websocketSnapshot = await waitForSnapshotEvent(websocketUrl.toString());

    return {
      ok: sessionResponse.ok && websocketSnapshot.ok,
      durationMs: Date.now() - startedAt,
      sessionStatus: sessionResponse.status,
      sessionUser: sessionPayload.user || null,
      permissions: sessionPayload.permissions || null,
      websocket: websocketSnapshot,
    };
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      error: normalizeError(error),
    };
  }
}

async function waitForSnapshotEvent(websocketUrl) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      socket.terminate();
      resolve({
        ok: false,
        error: "Timed out waiting for notifications.snapshot_required.",
      });
    }, 10000);

    const socket = new WebSocket(websocketUrl);

    socket.once("message", (data) => {
      clearTimeout(timeout);

      try {
        const payload = JSON.parse(String(data));
        socket.close();
        resolve({
          ok: payload.type === "notifications.snapshot_required",
          type: payload.type || null,
          unreadCount: payload.payload?.unreadCount ?? null,
          timestamp: payload.timestamp || null,
        });
      } catch (error) {
        socket.terminate();
        resolve({
          ok: false,
          error: normalizeError(error),
        });
      }
    });

    socket.once("error", (error) => {
      clearTimeout(timeout);
      resolve({
        ok: false,
        error: normalizeError(error),
      });
    });

    socket.once("close", (code, reasonBuffer) => {
      clearTimeout(timeout);
      if (code === 1000) {
        return;
      }

      resolve({
        ok: false,
        code,
        reason: reasonBuffer?.toString() || "",
      });
    });
  });
}

function normalizeError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  return {
    message: String(error),
    name: "Error",
  };
}
