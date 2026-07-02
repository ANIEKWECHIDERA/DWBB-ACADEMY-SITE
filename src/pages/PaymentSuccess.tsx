import { CheckCircle2, ExternalLink, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiUrl } from "@/lib/api";
import { clearPaymentSession, getPaymentSession } from "@/lib/payment-session";
import type { VerificationResponse } from "@/lib/payments";

const paymentDebugEnabled = import.meta.env.VITE_ENABLE_PAYMENT_DEBUG === "true";
const MAX_VERIFY_ATTEMPTS = 6;

async function verifyPaymentReference(reference: string) {
  const response = await fetch(apiUrl("/api/payments/verify"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reference }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Unable to verify payment.");
  }

  return payload as VerificationResponse;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref") || "";
  const [result, setResult] = useState<VerificationResponse | null>(() => {
    const session = getPaymentSession();
    return session?.reference === reference ? session.result : null;
  });
  const [loading, setLoading] = useState(!result && Boolean(reference));
  const [error, setError] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    if (!reference || result) {
      return;
    }

    let active = true;
    let timeoutId: number | undefined;

    async function verify(nextAttempt: number) {
      let verified = false;

      try {
        if (active) {
          setAttemptCount(nextAttempt);
        }

        const payload = await verifyPaymentReference(reference);

        if (active) {
          verified = true;
          setResult(payload);
          setError("");
        }
      } catch (verificationError) {
        if (active) {
          setError(verificationError instanceof Error ? verificationError.message : "Unable to verify payment.");

          if (nextAttempt < MAX_VERIFY_ATTEMPTS) {
            const retryDelayMs = Math.min(1500 * nextAttempt, 8000);
            timeoutId = window.setTimeout(() => {
              verify(nextAttempt + 1);
            }, retryDelayMs);
            return;
          }
        }
      } finally {
        if (active) {
          if (verified || nextAttempt >= MAX_VERIFY_ATTEMPTS) {
            setLoading(false);
          }
        }
      }
    }

    verify(1);

    return () => {
      active = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [reference, result]);

  useEffect(() => {
    return () => {
      clearPaymentSession();
    };
  }, []);

  async function handleManualRetry() {
    if (!reference) {
      return;
    }

    setLoading(true);
    setError("");
    setAttemptCount(0);

    try {
      const payload = await verifyPaymentReference(reference);
      setResult(payload);
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Unable to verify payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-gradient-hero py-20">
      <div className="container-shell">
        <Card className="mx-auto max-w-3xl rounded-[36px] border border-white/10 bg-white p-8 sm:p-10">
          <BrandLogo className="justify-center" imageClassName="h-20" withWordmark={false} />
          <div className="mt-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">Payment Status</p>
            <h1 className="mt-4 text-4xl font-bold text-slate-950 sm:text-5xl">Course purchase confirmation</h1>
            {reference ? <p className="mt-3 text-sm text-slate-500">Reference: {reference}</p> : null}
          </div>

          {loading ? (
            <div className="mt-10 flex flex-col items-center gap-4 text-center">
              <LoaderCircle className="h-10 w-10 animate-spin text-brand-sky" />
              <p className="text-slate-600">Verifying your Paystack transaction and preparing your download...</p>
              {attemptCount > 0 ? <p className="text-sm text-slate-500">Confirmation attempt {attemptCount} of {MAX_VERIFY_ATTEMPTS}</p> : null}
            </div>
          ) : null}

          {!loading && result ? (
            <div className="mt-10 space-y-6">
              <div className="rounded-[28px] border border-brand-green/20 bg-brand-green/5 p-6 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-brand-green" />
                <p className="mt-4 text-2xl font-bold text-slate-950">{result.courseTitle}</p>
                <p className="mt-3 text-slate-600">{result.message}</p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button asChild className="flex-1" variant="gold">
                  <a download href={result.downloadUrl}>
                    Download Materials
                  </a>
                </Button>
                {result.emailPreviewUrl ? (
                  <Button asChild className="flex-1 rounded-full border border-slate-200 bg-white" variant="ghost">
                    <a href={result.emailPreviewUrl} target="_blank" rel="noreferrer">
                      Open Test Email <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {!loading && !result ? (
            <div className="mt-10 rounded-[28px] border border-brand-coral/20 bg-brand-coral/5 p-6 text-center">
              <p className="text-xl font-semibold text-slate-950">We couldn't confirm this payment yet.</p>
              <p className="mt-3 text-slate-600">
                {error || "No Paystack reference was found. If you completed payment, try again in a moment."}
              </p>
              <p className="mt-3 text-sm text-slate-500">
                If Paystack already charged you, your payment may still be syncing. Wait a few seconds and retry confirmation.
              </p>
              {reference ? (
                <div className="mt-6">
                  <Button onClick={handleManualRetry} variant="gold">
                    Retry Confirmation
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {paymentDebugEnabled ? (
            <div className="mt-8 text-center">
              <Button asChild className="rounded-full border border-slate-200 bg-white" variant="ghost">
                <Link to="/payments/console">Open Payment Console</Link>
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
