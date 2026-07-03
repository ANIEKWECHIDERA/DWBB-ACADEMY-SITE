import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";

const steps = [
  { number: "01", title: "Choose Your Course", description: "Browse our catalog and pick the skill you want to build.", color: "bg-brand-coral" },
  { number: "02", title: "Enroll & Pay", description: "Register online or via WhatsApp and secure your spot.", color: "bg-brand-sky" },
  { number: "03", title: "Learn & Build", description: "Attend live sessions, complete projects, and get mentored.", color: "bg-brand-green" },
  { number: "04", title: "Get Certified", description: "Graduate with a recognized certificate and career support.", color: "bg-brand-gold" },
];

export function HowItWorksSection() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-shell">
        <SectionHeader eyebrow="How It Works" heading="A simple path from interest to impact" />
        <div className="relative mt-10 grid gap-5 sm:mt-12 sm:gap-6 lg:grid-cols-4">
          <div className="absolute left-20 right-20 top-11 hidden border-t border-dashed border-slate-300 lg:block" />
          {steps.map((step) => (
            <Card key={step.number} className="relative p-5 text-center sm:p-6">
              <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-lg font-bold text-slate-950 sm:h-20 sm:w-20 sm:text-xl ${step.color}`}>
                {step.number}
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-950 sm:mt-5 sm:text-xl">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
