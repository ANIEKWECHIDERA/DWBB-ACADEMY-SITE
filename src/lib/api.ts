const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export function apiUrl(path: string) {
  if (!rawApiBaseUrl) {
    return path;
  }

  const normalizedBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}
