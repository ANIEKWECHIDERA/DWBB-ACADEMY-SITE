import crypto from "node:crypto";
import path from "node:path";

import { getCheckoutPricing } from "../../src/lib/paystackPricing.js";

export function createPaymentService({
  adminRealtime,
  appBaseUrl,
  downloadLinkTtlDays,
  findPurchaseByReference,
  findPaymentAttempt,
  formatNaira,
  getCourseForCheckout,
  mailer,
  mirrorPurchaseSafe,
  normalizeApiBaseUrl,
  paystackPublicKey,
  paystackSecretKey,
  updatePurchaseRecord,
  createPurchaseRecord,
  createDownloadExpiry,
  logServerError,
}) {
  function ensurePaystackConfigured() {
    if (!paystackSecretKey || !paystackPublicKey) {
      throw new Error("Paystack environment variables are missing.");
    }
  }

  function getPaystackMode() {
    return String(paystackPublicKey || "").startsWith("pk_live_")
      ? "live"
      : "test";
  }

  function parseOptionalAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }

  async function verifyAndFulfill(reference, options = {}) {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      },
    );
    const payload = await response.json();

    if (!response.ok || !payload.status) {
      throw new Error(payload.message || "Unable to verify payment.");
    }

    const transaction = payload.data;
    const courseSlug = transaction.metadata?.courseSlug;
    const customerName =
      transaction.metadata?.customerName ||
      transaction.customer?.first_name ||
      "Customer";
    const customerPhone = transaction.metadata?.customerPhone || "";
    const publicAppBaseUrl = String(
      transaction.metadata?.appBaseUrl || appBaseUrl,
    ).replace(/\/+$/, "");
    const publicDownloadBaseUrl = normalizeApiBaseUrl(
      options.publicApiBaseUrl ||
        transaction.metadata?.publicApiBaseUrl ||
        options.publicApiBaseUrl ||
        publicAppBaseUrl,
    );
    const course = await getCourseForCheckout(courseSlug);

    if (!course) {
      throw new Error("Purchased course could not be identified.");
    }

    if (transaction.status !== "success") {
      throw new Error("Payment has not been completed successfully.");
    }

    const amountPaidKobo = Number(transaction.amount || 0);
    const paystackFeeKobo = Number(transaction.fees || 0);
    const metadataChargedAmountKobo = parseOptionalAmount(
      transaction.metadata?.chargedAmountKobo,
    );
    const metadataTargetAmountKobo = parseOptionalAmount(
      transaction.metadata?.targetAmountKobo,
    );
    const metadataProcessingFeeKobo = parseOptionalAmount(
      transaction.metadata?.processingFeeKobo,
    );
    const currentCheckoutPricing = getCheckoutPricing(course.priceNaira);
    const currentAmountCandidates = new Set([
      currentCheckoutPricing.totalChargeKobo,
      course.priceNaira * 100,
    ]);
    const recordedAttempt = await findPaymentAttempt(reference);
    const recordedAttemptAmountKobo = parseOptionalAmount(
      recordedAttempt?.amount,
    );
    const recordedAttemptTargetAmountKobo = parseOptionalAmount(
      recordedAttempt?.targetAmountKobo,
    );
    const recordedAttemptProcessingFeeKobo = parseOptionalAmount(
      recordedAttempt?.processingFeeKobo,
    );

    if (
      metadataChargedAmountKobo !== null &&
      amountPaidKobo !== metadataChargedAmountKobo
    ) {
      throw new Error("Payment amount mismatch detected.");
    }

    if (
      metadataChargedAmountKobo === null &&
      recordedAttemptAmountKobo !== null &&
      amountPaidKobo !== recordedAttemptAmountKobo
    ) {
      throw new Error("Payment amount mismatch detected.");
    }

    if (
      metadataChargedAmountKobo === null &&
      recordedAttemptAmountKobo === null &&
      !currentAmountCandidates.has(amountPaidKobo) &&
      !String(reference).startsWith(`dwbb-${course.slug}-`)
    ) {
      throw new Error("Payment amount mismatch detected.");
    }

    const inferredNetAmountKobo = Math.max(amountPaidKobo - paystackFeeKobo, 0);
    const targetAmountKobo =
      metadataTargetAmountKobo ??
      recordedAttemptTargetAmountKobo ??
      inferredNetAmountKobo;
    const processingFeeKobo =
      metadataProcessingFeeKobo ??
      recordedAttemptProcessingFeeKobo ??
      paystackFeeKobo;
    const deliveryAsset = Array.isArray(course.assets)
      ? course.assets.find((asset) => asset?.url) || null
      : null;

    const existing = await findPurchaseByReference(reference);

    if (existing) {
      return {
        success: true,
        alreadyFulfilled: true,
        courseTitle: existing.courseTitle,
        emailPreviewUrl: existing.emailPreviewUrl || null,
        downloadUrl: `${normalizeApiBaseUrl(existing.downloadBaseUrl || publicDownloadBaseUrl)}/api/download/${existing.downloadToken}`,
        message: "Payment verified. Your download is ready.",
      };
    }

    const downloadToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = createDownloadExpiry().toISOString();
    const downloadUrl = `${publicDownloadBaseUrl}/api/download/${downloadToken}`;

    const purchase = {
      reference,
      courseSlug: course.slug,
      courseTitle: course.title,
      email: transaction.customer?.email,
      name: customerName,
      phone: customerPhone,
      amount: amountPaidKobo,
      chargedAmountKobo: amountPaidKobo,
      coursePriceKobo: targetAmountKobo,
      processingFeeKobo,
      paidAt: new Date().toISOString(),
      deliveryAsset,
      downloadToken,
      downloadBaseUrl: publicDownloadBaseUrl,
      expiresAt,
      emailDeliveryStatus: transaction.customer?.email ? "pending" : "skipped",
      emailPreviewUrl: null,
      fileName: deliveryAsset?.fileName || course.fileName || null,
    };

    await createPurchaseRecord(purchase);
    const mirrorResult = await mirrorPurchaseSafe({ purchase, transaction, course });

    if (mirrorResult?.notification) {
      await adminRealtime?.broadcastNotificationCreated(mirrorResult.notification);
    }

    try {
      await mailer.sendPurchaseAlertEmail({
        chargedAmount: formatNaira(Math.round(amountPaidKobo / 100)),
        courseTitle: course.title,
        customerEmail: transaction.customer?.email || "",
        customerName,
        netAmount: formatNaira(Math.round(targetAmountKobo / 100)),
        paidAt: purchase.paidAt,
        phone: customerPhone,
        reference,
      });
    } catch (error) {
      logServerError(`Purchase alert email failed for ${reference}`, error);
    }

    let emailMessage = `Payment verified. Download access is ready for ${downloadLinkTtlDays} days.`;

    if (transaction.customer?.email) {
      try {
        const emailResult = await mailer.sendConfirmationEmail({
          courseTitle: course.title,
          customerName,
          email: transaction.customer?.email,
          downloadUrl,
        });

        purchase.emailPreviewUrl = emailResult.previewUrl || null;
        purchase.emailDeliveryStatus = "sent";
        await updatePurchaseRecord(reference, {
          emailDeliveryStatus: purchase.emailDeliveryStatus,
          emailPreviewUrl: purchase.emailPreviewUrl,
        });

        emailMessage = emailResult.previewUrl
          ? `${emailMessage} A preview email was generated for testing.`
          : `${emailMessage} A confirmation email has been sent.`;
      } catch (error) {
        purchase.emailDeliveryStatus = "failed";
        await updatePurchaseRecord(reference, {
          emailDeliveryStatus: purchase.emailDeliveryStatus,
        });
        logServerError(`Confirmation email failed for ${reference}`, error);
        emailMessage = `${emailMessage} Your materials are available now, but the confirmation email could not be sent automatically.`;
      }
    }

    return {
      success: true,
      courseTitle: course.title,
      emailPreviewUrl: purchase.emailPreviewUrl,
      downloadUrl,
      message: emailMessage,
    };
  }

  function sanitizeAssetFileName(fileName) {
    const trimmed = String(fileName || "").trim();
    const sanitized = trimmed.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "");
    return sanitized || "dwbb-course-materials.txt";
  }

  function ensureFileNameExtension(fileName, format) {
    const normalizedFileName = String(fileName || "").trim();
    const normalizedFormat = String(format || "")
      .trim()
      .replace(/^\./, "");

    if (!normalizedFileName) {
      return normalizedFormat
        ? `dwbb-course-materials.${normalizedFormat}`
        : "dwbb-course-materials";
    }

    if (!normalizedFormat || path.extname(normalizedFileName)) {
      return normalizedFileName;
    }

    return `${normalizedFileName}.${normalizedFormat}`;
  }

  function resolveDownloadFileName({ asset, fallbackFileName }) {
    if (!asset) {
      return fallbackFileName;
    }

    const candidateName =
      asset.fileName ||
      asset.originalFilename ||
      fallbackFileName ||
      "dwbb-course-materials";

    return ensureFileNameExtension(candidateName, asset.format);
  }

  function getDownloadMimeType(fileName) {
    const extension = path.extname(String(fileName || "")).toLowerCase();

    return (
      {
        ".csv": "text/csv; charset=utf-8",
        ".doc": "application/msword",
        ".docx":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".json": "application/json; charset=utf-8",
        ".pdf": "application/pdf",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".txt": "text/plain; charset=utf-8",
        ".xls": "application/vnd.ms-excel",
        ".xlsx":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".zip": "application/zip",
      }[extension] || null
    );
  }

  return {
    ensurePaystackConfigured,
    getDownloadMimeType,
    getPaystackMode,
    resolveDownloadFileName,
    sanitizeAssetFileName,
    verifyAndFulfill,
  };
}
