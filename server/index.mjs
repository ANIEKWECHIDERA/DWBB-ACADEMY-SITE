import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";

import { digitalCourseCatalog, findDigitalCourse } from "./course-catalog.mjs";

dotenv.config();

const app = express();
const port = Number(process.env.SERVER_PORT || 8787);
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY;
const purchasesFile = path.resolve(process.cwd(), "server/.data/purchases.json");
const attemptsFile = path.resolve(process.cwd(), "server/.data/payment-attempts.json");
const webhookEventsFile = path.resolve(process.cwd(), "server/.data/webhook-events.json");

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      req.rawBody = buffer.toString();
    },
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/store/courses", (_req, res) => {
  res.json({
    courses: digitalCourseCatalog.map((course) => ({
      slug: course.slug,
      title: course.title,
      priceNaira: course.priceNaira,
      price: formatNaira(course.priceNaira),
      deliverables: course.deliverables,
    })),
  });
});

app.get("/api/payments/debug/attempts", async (_req, res) => {
  const attempts = await readJsonFile(attemptsFile);
  res.json({ attempts });
});

app.get("/api/payments/debug/webhooks", async (_req, res) => {
  const events = await readJsonFile(webhookEventsFile);
  res.json({ events });
});

app.post("/api/payments/initialize", async (req, res) => {
  try {
    ensurePaystackConfigured();

    const { courseSlug, name, email, phone } = req.body ?? {};
    const course = findDigitalCourse(courseSlug);

    if (!course || !name || !email) {
      return res.status(400).json({ error: "Missing required payment details." });
    }

    const reference = `dwbb-${course.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const amount = course.priceNaira * 100;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
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
        callback_url: `${appBaseUrl}/payment/success`,
        metadata: {
          custom_fields: [
            { display_name: "Course", variable_name: "course", value: course.title },
            { display_name: "Customer Name", variable_name: "customer_name", value: name },
            { display_name: "Phone", variable_name: "phone", value: phone || "" },
          ],
          courseSlug: course.slug,
          customerName: name,
          customerPhone: phone || "",
          productType: "digital-course",
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok || !payload.status) {
      return res.status(502).json({
        error: payload.message || "Unable to initialize payment with Paystack.",
      });
    }

    const attempts = await readJsonFile(attemptsFile);
    attempts.push({
      type: "initialize",
      reference: payload.data.reference,
      accessCode: payload.data.access_code,
      courseSlug: course.slug,
      courseTitle: course.title,
      amount,
      email,
      name,
      phone: phone || "",
      createdAt: new Date().toISOString(),
    });
    await writeJsonFile(attemptsFile, attempts);

    res.json({
      accessCode: payload.data.access_code,
      reference: payload.data.reference,
      amount,
      publicKey: paystackPublicKey,
    });
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.post("/api/payments/verify", async (req, res) => {
  try {
    ensurePaystackConfigured();

    const { reference } = req.body ?? {};
    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required." });
    }

    const fulfillment = await verifyAndFulfill(reference);
    res.json(fulfillment);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.post("/api/payments/webhook", async (req, res) => {
  try {
    ensurePaystackConfigured();
    const signature = req.headers["x-paystack-signature"];
    const hash = crypto.createHmac("sha512", paystackSecretKey).update(req.rawBody || "").digest("hex");

    if (!signature || signature !== hash) {
      return res.status(401).json({ error: "Invalid webhook signature." });
    }

    const events = await readJsonFile(webhookEventsFile);
    events.push({
      event: req.body?.event || "unknown",
      reference: req.body?.data?.reference || null,
      payload: req.body,
      receivedAt: new Date().toISOString(),
    });
    await writeJsonFile(webhookEventsFile, events);

    res.status(200).json({ received: true });

    if (req.body?.event === "charge.success") {
      const reference = req.body?.data?.reference;
      if (reference) {
        verifyAndFulfill(reference).catch((error) => {
          console.error("Webhook fulfillment failed:", getErrorMessage(error));
        });
      }
    }
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

app.get("/api/download/:token", async (req, res) => {
  const purchases = await readPurchases();
  const purchase = purchases.find((entry) => entry.downloadToken === req.params.token);

  if (!purchase) {
    return res.status(404).json({ error: "Download link is invalid or has expired." });
  }

  res.download(purchase.filePath, purchase.fileName);
});

app.listen(port, () => {
  console.log(`DWBB Academy backend running on http://localhost:${port}`);
});

async function verifyAndFulfill(reference) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
    },
  });
  const payload = await response.json();

  if (!response.ok || !payload.status) {
    throw new Error(payload.message || "Unable to verify payment.");
  }

  const transaction = payload.data;
  const courseSlug = transaction.metadata?.courseSlug;
  const customerName = transaction.metadata?.customerName || transaction.customer?.first_name || "Customer";
  const customerPhone = transaction.metadata?.customerPhone || "";
  const course = findDigitalCourse(courseSlug);

  if (!course) {
    throw new Error("Purchased course could not be identified.");
  }

  if (transaction.status !== "success") {
    throw new Error("Payment has not been completed successfully.");
  }

  if (Number(transaction.amount) !== course.priceNaira * 100) {
    throw new Error("Payment amount mismatch detected.");
  }

  const purchases = await readPurchases();
  const existing = purchases.find((entry) => entry.reference === reference);

  if (existing) {
    return {
      success: true,
      alreadyFulfilled: true,
      courseTitle: existing.courseTitle,
      emailPreviewUrl: existing.emailPreviewUrl || null,
      downloadUrl: `${appBaseUrl}/api/download/${existing.downloadToken}`,
      message: "Payment verified. Your download is ready.",
    };
  }

  const downloadToken = crypto.randomBytes(24).toString("hex");
  const emailResult = await sendConfirmationEmail({
    courseTitle: course.title,
    customerName,
    email: transaction.customer?.email,
    downloadUrl: `${appBaseUrl}/api/download/${downloadToken}`,
  });

  const purchase = {
    reference,
    courseSlug: course.slug,
    courseTitle: course.title,
    email: transaction.customer?.email,
    name: customerName,
    phone: customerPhone,
    amount: transaction.amount,
    paidAt: new Date().toISOString(),
    downloadToken,
    filePath: course.filePath,
    fileName: course.fileName,
    emailPreviewUrl: emailResult.previewUrl || null,
  };

  purchases.push(purchase);
  await writePurchases(purchases);

  return {
    success: true,
    courseTitle: course.title,
    emailPreviewUrl: emailResult.previewUrl || null,
    downloadUrl: `${appBaseUrl}/api/download/${downloadToken}`,
    message: emailResult.previewUrl
      ? "Payment verified. Download access is ready and a preview email was generated for testing."
      : "Payment verified. Download access is ready and a confirmation email has been sent.",
  };
}

async function sendConfirmationEmail({ courseTitle, customerName, email, downloadUrl }) {
  if (!email) {
    return { previewUrl: null };
  }

  const transporter = await createMailTransport();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || "DWBB Academy <no-reply@dwbbacademy.com>",
    to: email,
    subject: `Your ${courseTitle} download is ready`,
    text: [
      `Hello ${customerName},`,
      "",
      `Thank you for purchasing ${courseTitle}.`,
      "Your payment was confirmed successfully.",
      "",
      `Download your course materials here: ${downloadUrl}`,
      "",
      "If you need help, reply to this email or contact DWBB Academy.",
    ].join("\n"),
  });

  return {
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}

let cachedTransportPromise;

async function createMailTransport() {
  if (!cachedTransportPromise) {
    cachedTransportPromise = (async () => {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: String(process.env.SMTP_SECURE || "false") === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      }

      const account = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });
    })();
  }

  return cachedTransportPromise;
}

async function ensureDataFile() {
  await fs.mkdir(path.dirname(purchasesFile), { recursive: true });
  await Promise.all([
    ensureJsonArrayFile(purchasesFile),
    ensureJsonArrayFile(attemptsFile),
    ensureJsonArrayFile(webhookEventsFile),
  ]);
}

async function readPurchases() {
  return readJsonFile(purchasesFile);
}

async function writePurchases(purchases) {
  await writeJsonFile(purchasesFile, purchases);
}

function ensurePaystackConfigured() {
  if (!paystackSecretKey || !paystackPublicKey) {
    throw new Error("Paystack environment variables are missing.");
  }
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unexpected server error.";
}

function formatNaira(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

async function ensureJsonArrayFile(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]", "utf8");
  }
}

async function readJsonFile(filePath) {
  await ensureDataFile();
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function writeJsonFile(filePath, value) {
  await ensureDataFile();
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}
