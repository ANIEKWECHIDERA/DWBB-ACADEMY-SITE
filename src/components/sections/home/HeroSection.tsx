import { ArrowRight, Dot } from "lucide-react";
import { Link } from "react-router-dom";

import { PetalOrb } from "@/components/shared/PetalOrb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero text-white">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <PetalOrb className="-right-20 top-0" size={600} blur={80} opacity={0.35} />
      <div className="container-shell relative py-20 sm:py-24 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge>🎓 Nigeria&apos;s Rising Digital Academy</Badge>
            <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              Equip Yourself for the <span className="text-gradient-gold">Digital Economy</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
              Hands-on training in Data Analytics, Web & Mobile Development, AI, and more. Learn from industry experts and build a career that matters.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild variant="gold">
                <a href={buildWhatsAppUrl("Hello DWBB Academy! I'm interested in your courses. Can you help me get started?")} target="_blank" rel="noreferrer">
                  Start Learning Today <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link to="/courses">Explore Courses</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-2 text-sm uppercase tracking-[0.18em] text-white/65">
              <span>500+ Graduates</span>
              <Dot className="h-4 w-4" />
              <span>5 Expert Instructors</span>
              <Dot className="h-4 w-4" />
              <span>92% Employment Rate</span>
            </div>
          </div>

          <div className="relative">
            <div className="surface-panel relative overflow-hidden rounded-[36px] border border-white/15 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { title: "Data Analytics", accent: "bg-brand-sky" },
                  { title: "Web Development", accent: "bg-brand-coral" },
                  { title: "AI & Automation", accent: "bg-brand-gold" },
                  { title: "Mobile App Dev", accent: "bg-brand-green" },
                ].map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/10 p-5">
                    <div className={`h-1.5 w-14 rounded-full ${item.accent}`} />
                    <p className="mt-5 font-display text-xl font-bold text-white">{item.title}</p>
                    <p className="mt-2 text-sm text-white/70">Live sessions, projects, mentorship, and certification.</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -top-4 right-6 rounded-full bg-white/10 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-green" />
                Next Cohort: July 6, 2026
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
