const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export function apiUrl(path: string) {
  if (!rawApiBaseUrl) {
    return path;
  }

  const normalizedBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function apiWebSocketUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (rawApiBaseUrl) {
    const baseUrl = new URL(rawApiBaseUrl);
    baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
    baseUrl.pathname = normalizedPath;
    baseUrl.search = "";
    return baseUrl.toString();
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${normalizedPath}`;
}
