import type { User } from "firebase/auth";

import { apiWebSocketUrl } from "@/lib/api";
import type { AdminRealtimeEvent } from "@/types/admin";

export function connectAdminRealtime(user: User, handlers: {
  onError?: (event: Event) => void;
  onEvent: (event: AdminRealtimeEvent) => void;
  onOpen?: () => void;
}) {
  let socket: WebSocket | null = null;
  let closed = false;
  let reconnectTimer: number | null = null;
  let reconnectAttempt = 0;

  async function connect() {
    try {
      const token = await user.getIdToken();
      const url = new URL(apiWebSocketUrl("/api/admin/realtime"));
      url.searchParams.set("token", token);

      socket = new WebSocket(url.toString());

      socket.addEventListener("open", () => {
        reconnectAttempt = 0;
        handlers.onOpen?.();
      });

      socket.addEventListener("message", (messageEvent) => {
        try {
          const payload = JSON.parse(String(messageEvent.data || ""));
          handlers.onEvent(payload as AdminRealtimeEvent);
        } catch {
          // Ignore malformed realtime payloads without breaking the session.
        }
      });

      socket.addEventListener("error", (event) => {
        handlers.onError?.(event);
      });

      socket.addEventListener("close", () => {
        socket = null;
        if (closed) {
          return;
        }

        const delayMs = Math.min(1000 * 2 ** reconnectAttempt, 15000);
        reconnectAttempt += 1;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          void connect();
        }, delayMs);
      });
    } catch {
      if (closed) {
        return;
      }

      const delayMs = Math.min(1000 * 2 ** reconnectAttempt, 15000);
      reconnectAttempt += 1;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, delayMs);
    }
  }

  void connect();

  return {
    close() {
      closed = true;

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }

      if (socket) {
        socket.close();
      }
    },
  };
}
