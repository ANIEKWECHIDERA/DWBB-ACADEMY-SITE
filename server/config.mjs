import os from "node:os";
import path from "node:path";

import dotenv from "dotenv";

dotenv.config();

export const isProduction = process.env.NODE_ENV === "production";
export const port = Number(process.env.PORT || process.env.SERVER_PORT || 8787);
export const appBaseUrl =
  process.env.APP_BASE_URL || "http://localhost:5173";
export const publicApiBaseUrl =
  process.env.PUBLIC_API_BASE_URL || process.env.SERVER_PUBLIC_URL || "";
export const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
export const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY;
export const enablePaymentDebug =
  String(process.env.ENABLE_PAYMENT_DEBUG || "false") === "true";
export const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
export const downloadLinkTtlDays = Number(
  process.env.DOWNLOAD_LINK_TTL_DAYS || 7,
);
export const trustProxy = process.env.TRUST_PROXY;
export const configuredDataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), "server/.data");
export const fallbackDataDir = path.join(os.tmpdir(), "dwbb-academy-data");
export const purchaseCollectionName = "purchases";
export const adminUserCacheTtlMs = 10 * 60 * 1000;
export const adminLoginDedupTtlMs = 6 * 60 * 60 * 1000;
export const adminViewAuditDedupTtlMs = 2 * 60 * 1000;
