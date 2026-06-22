import { useEffect, useState } from "react";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { Card } from "@/components/ui/card";

interface AttemptItem {
  reference: string;
  courseTitle: string;
  email: string;
  amount: number;
  createdAt: string;
}

interface WebhookItem {
  event: string;
  reference: string | null;
  receivedAt: string;
}

export default function PaymentConsole() {
  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const [events, setEvents] = useState<WebhookItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [attemptResponse, webhookResponse] = await Promise.all([
          fetch("/api/payments/debug/attempts"),
          fetch("/api/payments/debug/webhooks"),
        ]);

        const attemptPayload = await attemptResponse.json();
        const webhookPayload = await webhookResponse.json();

        if (!attemptResponse.ok || !webhookResponse.ok) {
          throw new Error("Unable to load payment debug data.");
        }

        if (active) {
          setAttempts((attemptPayload.attempts || []).slice().reverse());
          setEvents((webhookPayload.events || []).slice().reverse());
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load payment console.");
        }
      }
    }

    load();
    const interval = window.setInterval(load, 4000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="py-20">
      <div className="container-shell">
        <SectionHeader
          eyebrow="Payment Console"
          heading="Visible transaction and webhook activity while testing locally"
          subtext="This page polls your local backend debug endpoints so you can see initialized payment attempts and incoming webhooks without leaving the app."
        />

        {error ? <p className="mt-8 text-center text-sm text-brand-coral">{error}</p> : null}

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-slate-950">Payment Attempts</h2>
            <div className="mt-6 space-y-4">
              {attempts.length === 0 ? <p className="text-sm text-slate-500">No local attempts recorded yet.</p> : null}
              {attempts.map((attempt) => (
                <div key={attempt.reference} className="rounded-[24px] border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">{attempt.courseTitle}</p>
                  <p className="mt-1 text-sm text-slate-500">{attempt.email}</p>
                  <p className="mt-2 text-sm text-slate-700">{attempt.reference}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Amount: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(attempt.amount / 100)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{attempt.createdAt}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-bold text-slate-950">Webhook Events</h2>
            <div className="mt-6 space-y-4">
              {events.length === 0 ? <p className="text-sm text-slate-500">No webhook events received yet.</p> : null}
              {events.map((event, index) => (
                <div key={`${event.reference ?? "event"}-${index}`} className="rounded-[24px] border border-slate-200 p-4">
                  <p className="font-semibold text-slate-950">{event.event}</p>
                  <p className="mt-2 text-sm text-slate-700">{event.reference || "No reference"}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{event.receivedAt}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
