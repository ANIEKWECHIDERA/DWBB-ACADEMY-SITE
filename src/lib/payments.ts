import PaystackPop from "@paystack/inline-js";

import { apiUrl } from "@/lib/api";
import type { Course } from "@/types/course";

export interface PurchaseFormValues {
  name: string;
  email: string;
  phone: string;
}

export interface VerificationResponse {
  success: boolean;
  alreadyFulfilled?: boolean;
  courseTitle: string;
  message: string;
  downloadUrl: string;
  emailPreviewUrl?: string | null;
}

export async function startCourseCheckout(course: Course, customer: PurchaseFormValues) {
  const initializeResponse = await fetch(apiUrl("/api/payments/initialize"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      courseSlug: course.slug,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    }),
  });

  const initializePayload = await initializeResponse.json();

  if (!initializeResponse.ok) {
    throw new Error(initializePayload.error || "Unable to initialize payment.");
  }

  return new Promise<{ reference: string; callbackUrl: string }>((resolve, reject) => {
    const popup = new PaystackPop();

    popup.resumeTransaction(initializePayload.accessCode, {
      onSuccess: async (transaction: { reference: string }) => {
        resolve({
          reference: transaction.reference,
          callbackUrl: initializePayload.callbackUrl,
        });
      },
      onCancel: () => {
        reject(new Error("Payment cancelled."));
      },
      onError: (error: { message?: string }) => {
        reject(new Error(error.message || "Unable to complete Paystack checkout."));
      },
    });
  });
}
