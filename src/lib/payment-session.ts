import type { VerificationResponse } from "@/lib/payments";

const SESSION_KEY = "dwbb-payment-result";

export function savePaymentSession(reference: string, result: VerificationResponse) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      reference,
      result,
      savedAt: new Date().toISOString(),
    }),
  );
}

export function getPaymentSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as {
      reference: string;
      result: VerificationResponse;
      savedAt: string;
    };
  } catch {
    return null;
  }
}

export function clearPaymentSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
