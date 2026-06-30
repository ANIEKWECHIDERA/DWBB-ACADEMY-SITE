import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCheckoutPricing } from "@/lib/paystackPricing";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { startCourseCheckout, type PurchaseFormValues } from "@/lib/payments";
import type { Course } from "@/types/course";

const initialValues: PurchaseFormValues = {
  name: "",
  email: "",
  phone: "",
};

export function PurchaseCourseButton({
  course,
  label = "Buy Digital Course",
  className,
  variant = "gold",
}: {
  course: Course;
  label?: string;
  className?: string;
  variant?: "gold" | "ghost" | "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<PurchaseFormValues>(initialValues);
  const [portalReady, setPortalReady] = useState(false);
  const { pushToast } = useToast();
  const checkoutPricing = getCheckoutPricing(course.priceNaira);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const { reference, callbackUrl } = await startCourseCheckout(course, values);
      const nextUrl = new URL(callbackUrl, window.location.origin);
      nextUrl.searchParams.set("reference", reference);
      nextUrl.searchParams.set("trxref", reference);
      window.location.assign(nextUrl.toString());
    } catch (error) {
      pushToast({
        title: "Checkout interrupted",
        description: error instanceof Error ? error.message : "We could not complete the payment flow.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSubmitting(false);
  };

  const checkoutDialog = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[130] bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex min-h-full items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-2xl"
            >
              <Card className="max-h-[90vh] overflow-y-auto p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Digital Course Checkout</p>
                    <h3 className="mt-3 text-3xl font-bold text-slate-950">{course.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      One-time payment. Paystack processing is added at checkout so DWBB Academy receives the full course fee.
                    </p>
                  </div>
                  <button type="button" aria-label="Close checkout" onClick={handleClose}>
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                      <Label htmlFor={`name-${course.slug}`}>Full Name *</Label>
                      <Input
                        id={`name-${course.slug}`}
                        required
                        value={values.name}
                        onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`email-${course.slug}`}>Email Address *</Label>
                      <Input
                        id={`email-${course.slug}`}
                        required
                        type="email"
                        value={values.email}
                        onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`phone-${course.slug}`}>Phone Number</Label>
                      <Input
                        id={`phone-${course.slug}`}
                        value={values.phone}
                        onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
                      />
                    </div>
                    <Button className="w-full" disabled={submitting} type="submit" variant="gold">
                      {submitting ? "Waiting for Paystack confirmation..." : "Continue to Paystack"}
                    </Button>
                  </form>

                  <Card className="border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Order Summary</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-4">
                        <span>Course fee</span>
                        <span className="font-semibold text-slate-950">{course.price}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Paystack processing</span>
                        <span className="font-semibold text-slate-950">
                          N{checkoutPricing.processingFeeNaira.toLocaleString("en-NG")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3 text-base">
                        <span className="font-semibold text-slate-950">Total charged today</span>
                        <span className="text-2xl font-bold text-slate-950">
                          N{checkoutPricing.totalChargeNaira.toLocaleString("en-NG")}
                        </span>
                      </div>
                    </div>
                    {course.priceUSD ? <p className="mt-2 text-sm text-slate-500">{course.priceUSD} course value before processing</p> : null}
                    <p className="mt-5 text-sm font-semibold text-slate-950">What you get immediately:</p>
                    <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                      {course.digitalDeliverables.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                    <p className="mt-5 text-xs leading-6 text-slate-500">
                      The final Paystack amount is calculated on the server from the official course catalog, so the payable amount cannot be lowered from the browser.
                    </p>
                    <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                      One-time payment only <ArrowRight className="h-3.5 w-3.5" />
                    </p>
                  </Card>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <Button className={className} onClick={() => setOpen(true)} type="button" variant={variant}>
        {label}
      </Button>
      {portalReady ? createPortal(checkoutDialog, document.body) : null}
    </>
  );
}
