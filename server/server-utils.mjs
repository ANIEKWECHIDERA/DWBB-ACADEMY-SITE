import { logger } from "./logger.mjs";

export function formatNaira(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function logServerError(context, error) {
  if (error instanceof Error) {
    logger.error("server.error", {
      context,
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  logger.error("server.error", {
    context,
    error,
  });
}

export function isFirestoreQuotaError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");

  return (
    code === "8" ||
    code.toUpperCase() === "RESOURCE_EXHAUSTED" ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("quota exceeded")
  );
}
