import crypto from "node:crypto";
import process from "node:process";

import dotenv from "dotenv";

dotenv.config();

const webhookUrl = process.argv[2] || "http://localhost:8787/api/payments/webhook";
const reference = process.argv[3] || `test-ref-${Date.now()}`;
const secretKey = process.env.PAYSTACK_SECRET_KEY;

if (!secretKey) {
  throw new Error("PAYSTACK_SECRET_KEY is missing from .env");
}

const payload = {
  event: "charge.success",
  data: {
    id: Date.now(),
    domain: "test",
    status: "success",
    reference,
    amount: 10000,
    paid_at: new Date().toISOString(),
    customer: {
      email: "local-webhook-test@example.com",
    },
    metadata: {
      courseSlug: "ai-automation",
      customerName: "Webhook Test User",
      customerPhone: "08000000000",
    },
  },
};

const body = JSON.stringify(payload);
const signature = crypto.createHmac("sha512", secretKey).update(body).digest("hex");

const response = await fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-paystack-signature": signature,
  },
  body,
});

const text = await response.text();

console.log(`Status: ${response.status}`);
console.log(text);
