import crypto from "node:crypto";

import { getCheckoutPricing } from "../../src/lib/paystackPricing.js";

export function registerPaymentRoutes(
  app,
  {
    courseService,
    downloadRateLimit,
    enablePaymentDebug,
    findDigitalCourse,
    getClientIdentifier,
    getPublicApiBaseUrl,
    getPublicAppBaseUrl,
    initializeRateLimit,
    logServerError,
    paystackPublicKey,
    paystackSecretKey,
    paymentService,
    purchaseStore,
    verifyRateLimit,
    webhookRateLimit,
  },
) {
  const requirePaymentDebug = (_req, res, next) => {
    if (!enablePaymentDebug) {
      return res.status(404).json({ error: "Not found." });
    }

    next();
  };

  app.get(
    "/api/payments/debug/attempts",
    requirePaymentDebug,
    async (_req, res) => {
      const attempts = await purchaseStore.listPaymentAttempts();
      res.json({ attempts });
    },
  );

  app.get(
    "/api/payments/debug/webhooks",
    requirePaymentDebug,
    async (_req, res) => {
      const events = await purchaseStore.listWebhookEvents();
      res.json({ events });
    },
  );

  app.post("/api/payments/initialize", initializeRateLimit, async (req, res) => {
    try {
      paymentService.ensurePaystackConfigured();

      const { courseSlug, name, email, phone } = req.body ?? {};
      const course = await courseService.getCourseForCheckout(courseSlug);
      const publicAppBaseUrl = getPublicAppBaseUrl(req);
      const checkoutPricing = course
        ? getCheckoutPricing(course.priceNaira)
        : null;

      if (!course || !name || !email) {
        return res
          .status(400)
          .json({ error: "Missing required payment details." });
      }

      const reference = `dwbb-${course.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const amount = checkoutPricing.totalChargeKobo;

      const response = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            amount,
            currency: "NGN",
            reference,
            callback_url: `${publicAppBaseUrl}/payment/success`,
            metadata: {
              custom_fields: [
                {
                  display_name: "Course",
                  variable_name: "course",
                  value: course.title,
                },
                {
                  display_name: "Customer Name",
                  variable_name: "customer_name",
                  value: name,
                },
                {
                  display_name: "Phone",
                  variable_name: "phone",
                  value: phone || "",
                },
              ],
              appBaseUrl: publicAppBaseUrl,
              publicApiBaseUrl: getPublicApiBaseUrl(req),
              chargedAmountKobo: checkoutPricing.totalChargeKobo,
              courseSlug: course.slug,
              customerName: name,
              customerPhone: phone || "",
              processingFeeKobo: checkoutPricing.processingFeeKobo,
              productType: "digital-course",
              targetAmountKobo: checkoutPricing.baseAmountKobo,
            },
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok || !payload.status) {
        req.requestLogger?.error("payments.initialize.failed", {
          actorEmail: email,
          courseSlug,
          paystackMessage: payload?.message || null,
          statusCode: response.status,
          clientIp: getClientIdentifier(req),
        });
        return res.status(502).json({
          error: "Unable to start checkout right now.",
        });
      }

      await purchaseStore.recordPaymentAttempt({
        reference: payload.data.reference,
        accessCode: payload.data.access_code,
        courseSlug: course.slug,
        courseTitle: course.title,
        amount,
        processingFeeKobo: checkoutPricing.processingFeeKobo,
        targetAmountKobo: checkoutPricing.baseAmountKobo,
        email,
        appBaseUrl: publicAppBaseUrl,
        createdAt: new Date().toISOString(),
      });

      res.json({
        accessCode: payload.data.access_code,
        reference: payload.data.reference,
        amount,
        callbackUrl: `${publicAppBaseUrl}/payment/success`,
        processingFeeKobo: checkoutPricing.processingFeeKobo,
        publicKey: paystackPublicKey,
        targetAmountKobo: checkoutPricing.baseAmountKobo,
      });
    } catch (error) {
      logServerError("Payment initialize failed", error);
      res.status(500).json({ error: "Unable to start checkout right now." });
    }
  });

  app.post("/api/payments/verify", verifyRateLimit, async (req, res) => {
    try {
      paymentService.ensurePaystackConfigured();

      const { reference } = req.body ?? {};
      if (!reference) {
        return res.status(400).json({ error: "Payment reference is required." });
      }

      const fulfillment = await paymentService.verifyAndFulfill(reference, {
        publicApiBaseUrl: getPublicApiBaseUrl(req),
      });
      res.json(fulfillment);
    } catch (error) {
      logServerError("Payment verification failed", error);
      res.status(500).json({ error: "Unable to verify payment right now." });
    }
  });

  app.post("/api/payments/webhook", webhookRateLimit, async (req, res) => {
    try {
      paymentService.ensurePaystackConfigured();
      const signature = req.headers["x-paystack-signature"];
      const hash = crypto
        .createHmac("sha512", paystackSecretKey)
        .update(req.rawBody || "")
        .digest("hex");

      if (!signature || signature !== hash) {
        return res.status(401).json({ error: "Invalid webhook signature." });
      }

      await purchaseStore.recordWebhookEvent(req.body);

      res.status(200).json({ received: true });

      if (req.body?.event === "charge.success") {
        const reference = req.body?.data?.reference;
        if (reference) {
          paymentService
            .verifyAndFulfill(reference, {
              publicApiBaseUrl: getPublicApiBaseUrl(req),
            })
            .catch((error) => {
              logServerError("Webhook fulfillment failed", error);
            });
        }
      }
    } catch (error) {
      logServerError("Webhook processing failed", error);
      res.status(500).json({ error: "Unable to process webhook." });
    }
  });

  app.get("/api/download/:token", downloadRateLimit, async (req, res) => {
    const purchase = await purchaseStore.findPurchaseByDownloadToken(
      req.params.token,
    );

    if (!purchase) {
      return res
        .status(404)
        .json({ error: "Download link is invalid or has expired." });
    }

    const expiresAt = purchaseStore.getPurchaseExpiry(purchase);
    if (
      !expiresAt ||
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      return res.status(410).json({ error: "This download link has expired." });
    }

    const course = await courseService.getCourseForCheckout(purchase.courseSlug);
    const fallbackCourse = findDigitalCourse(purchase.courseSlug);
    const deliveryAsset =
      purchase.deliveryAsset ||
      (Array.isArray(course?.assets)
        ? course.assets.find((asset) => asset?.url)
        : null);
    const filePath =
      purchase.filePath || course?.filePath || fallbackCourse?.filePath;
    const fileName = paymentService.resolveDownloadFileName({
      asset: deliveryAsset,
      fallbackFileName:
        purchase.fileName ||
        course?.fileName ||
        fallbackCourse?.fileName ||
        "dwbb-course-materials.txt",
    });

    if (deliveryAsset?.url) {
      try {
        const assetResponse = await fetch(deliveryAsset.url);

        if (!assetResponse.ok) {
          return res
            .status(502)
            .json({ error: "Course materials are temporarily unavailable." });
        }

        const fileBuffer = Buffer.from(await assetResponse.arrayBuffer());
        const contentType =
          paymentService.getDownloadMimeType(fileName) ||
          assetResponse.headers.get("content-type") ||
          "application/octet-stream";
        const encodedFileName = encodeURIComponent(fileName)
          .replace(/['()]/g, escape)
          .replace(/\*/g, "%2A");
        res.setHeader("Content-Type", contentType);
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName.replace(/"/g, "")}"; filename*=UTF-8''${encodedFileName}`,
        );
        res.setHeader("Content-Length", String(fileBuffer.byteLength));
        res.setHeader("Cache-Control", "private, no-store, max-age=0");
        res.setHeader("X-Download-Options", "noopen");
        res.end(fileBuffer);
        return;
      } catch (error) {
        logServerError(
          `Cloudinary download failed for ${purchase.reference}`,
          error,
        );
        return res
          .status(502)
          .json({ error: "Course materials are temporarily unavailable." });
      }
    }

    if (!filePath || !fileName) {
      return res
        .status(404)
        .json({ error: "Course materials are no longer available." });
    }

    res.download(filePath, fileName);
  });
}
