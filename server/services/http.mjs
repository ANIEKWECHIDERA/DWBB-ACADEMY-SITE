export function createHttpService({
  allowedOrigins,
  appBaseUrl,
  publicApiBaseUrl,
  isProduction,
  trustProxy,
}) {
  const rateLimitStores = new Map();

  function securityHeadersMiddleware(_req, res, next) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    next();
  }

  function createCorsOptions() {
    return {
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
    };
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
        res
          .status(429)
          .json({ error: "Too many requests. Please try again shortly." });
        return;
      }

      entry.count += 1;
      rateLimitStores.set(storeKey, entry);
      next();
    };
  }

  function getClientIdentifier(req) {
    return (
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "unknown"
    );
  }

  function parseOriginValue(origin) {
    try {
      return new URL(origin);
    } catch {
      return null;
    }
  }

  function isLoopbackHostname(hostname) {
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
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

    return (
      isLoopbackHostname(candidateUrl.hostname) &&
      isLoopbackHostname(trustedUrl.hostname)
    );
  }

  function isAllowedOrigin(origin) {
    if (allowedOrigins.length > 0) {
      return allowedOrigins.some((allowedOrigin) =>
        originsMatch(origin, allowedOrigin),
      );
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

  function parseDashboardRange(value) {
    if (
      value === "today" ||
      value === "7d" ||
      value === "30d" ||
      value === "all"
    ) {
      return value;
    }

    return "30d";
  }

  function normalizeAppBaseUrl(value) {
    return String(value || appBaseUrl).replace(/\/+$/, "");
  }

  function normalizeApiBaseUrl(value) {
    return String(value || publicApiBaseUrl || appBaseUrl).replace(/\/+$/, "");
  }

  function getPublicAppBaseUrl(req) {
    const forwardedProtoHeader = req.headers["x-forwarded-proto"];
    const forwardedHostHeader = req.headers["x-forwarded-host"];
    const hostHeader = req.headers.host;
    const originHeader = req.headers.origin;
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader;
    const forwardedHost = Array.isArray(forwardedHostHeader)
      ? forwardedHostHeader[0]
      : forwardedHostHeader;
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

    if (origin && (isAllowedOrigin(origin) || !isProduction)) {
      return normalizeAppBaseUrl(origin);
    }

    if (trustProxy && (forwardedHost || hostHeader)) {
      return normalizeAppBaseUrl(
        `${forwardedProto || "http"}://${forwardedHost || hostHeader}`,
      );
    }

    if (!isProduction && hostHeader) {
      return normalizeAppBaseUrl(`http://${hostHeader}`);
    }

    return normalizeAppBaseUrl(appBaseUrl);
  }

  function getPublicApiBaseUrl(req) {
    const forwardedProtoHeader = req.headers["x-forwarded-proto"];
    const forwardedHostHeader = req.headers["x-forwarded-host"];
    const hostHeader = req.headers.host;
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader;
    const forwardedHost = Array.isArray(forwardedHostHeader)
      ? forwardedHostHeader[0]
      : forwardedHostHeader;

    if (publicApiBaseUrl) {
      return normalizeApiBaseUrl(publicApiBaseUrl);
    }

    if (trustProxy && (forwardedHost || forwardedProto)) {
      return normalizeApiBaseUrl(
        `${forwardedProto || "https"}://${forwardedHost || hostHeader}`,
      );
    }

    if (hostHeader) {
      return normalizeApiBaseUrl(
        `${isProduction ? "https" : "http"}://${hostHeader}`,
      );
    }

    return normalizeApiBaseUrl(appBaseUrl);
  }

  function shouldSkipAdminAuditLog(req) {
    return req.headers["x-admin-background-refresh"] === "1";
  }

  return {
    createCorsOptions,
    createRateLimiter,
    getClientIdentifier,
    getPublicApiBaseUrl,
    getPublicAppBaseUrl,
    isAllowedOrigin,
    normalizeApiBaseUrl,
    normalizeAppBaseUrl,
    parseDashboardRange,
    securityHeadersMiddleware,
    shouldSkipAdminAuditLog,
  };
}
