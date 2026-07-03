import { Card } from "@/components/ui/card";

export function MissionSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container-shell">
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
          <Card className="border-l-4 border-brand-coral p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-coral">Mission</p>
            <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
              To equip individuals with in-demand digital and professional skills through accessible, high-quality, hands-on training that bridges the gap between learning and real-world application.
            </p>
          </Card>
          <Card className="border-l-4 border-brand-sky p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-sky">Vision</p>
            <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
              To be Africa&apos;s most impactful digital academy, producing world-class tech talent that competes globally and drives local economic growth.
            </p>
          </Card>
        </div>
        <Card className="relative mt-5 overflow-hidden p-6 sm:mt-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">Our Story</p>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">
            DWBB Academy began as a response to a problem we kept seeing: talented people with ambition but without the structure, mentorship, and access needed to translate learning into career movement. We built the academy to close that gap with focused, practical, deeply supportive training.
          </p>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">
            Today, we continue to design bootcamps around employable outcomes, not empty theory. Every curriculum, workshop, and support system is meant to help learners build confidence, produce visible work, and move into meaningful opportunities.
          </p>
        </Card>
      </div>
    </section>
  );
}
