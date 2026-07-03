import { ArrowRight, Dot } from "lucide-react";
import { Link } from "react-router-dom";

import { PetalOrb } from "@/components/shared/PetalOrb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const mentorImages = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero text-white">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <PetalOrb
        blur={80}
        className="-right-20 top-0"
        opacity={0.35}
        size={600}
      />
      <div className="container-shell relative py-16 sm:py-20 lg:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <Badge>🎓 Nigeria&apos;s Rising Digital Academy</Badge>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[0.95] text-white sm:mt-6 sm:text-5xl lg:text-7xl">
              Equip Yourself for the{" "}
              <span className="text-gradient-gold">Digital Economy</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:mt-6 sm:text-lg sm:leading-8">
              Hands-on training in Data Analytics, Web & Mobile Development, AI,
              and more. Learn from industry experts and build a career that
              matters.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:gap-4">
              <Button asChild variant="gold">
                <a
                  href={buildWhatsAppUrl(
                    "Hello DWBB Academy! I'm interested in your courses. Can you help me get started?",
                  )}
                  rel="noreferrer"
                  target="_blank"
                >
                  Start Learning Today <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link to="/courses">Explore Courses</Link>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/65 sm:mt-8 sm:text-sm">
              <span>500+ Graduates</span>
              <Dot className="h-4 w-4" />
              <span>5 Expert Instructors</span>
              <Dot className="h-4 w-4" />
              <span>92% Employment Rate</span>
            </div>
          </div>

          <div className="relative">
            <div className="surface-panel relative overflow-hidden rounded-[30px] border border-white/15 p-4 sm:rounded-[36px] sm:p-6">
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
                  <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/10">
                    <img
                      alt="DWBB Academy learners collaborating during a practical digital skills session"
                      className="h-56 w-full object-cover sm:h-72"
                      src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-4 sm:p-5">
                      <p className="text-sm font-semibold text-white sm:text-base">
                        Learn with people who are building real careers
                      </p>
                      <p className="mt-1 text-xs leading-6 text-white/75 sm:text-sm">
                        Collaborative practice, mentorship, and portfolio-ready
                        work.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                        Human-led support
                      </p>
                      <div className="mt-4 flex -space-x-3">
                        {mentorImages.map((imageUrl, index) => (
                          <img
                            key={imageUrl}
                            alt={`DWBB Academy mentor ${index + 1}`}
                            className="h-12 w-12 rounded-full border-2 border-white/30 object-cover"
                            src={imageUrl}
                          />
                        ))}
                      </div>
                      <p className="mt-4 text-sm leading-6 text-white/75">
                        Small-cohort guidance from mentors who understand the
                        local market.
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
                      <p className="text-3xl font-bold text-white">92%</p>
                      <p className="mt-2 text-sm leading-6 text-white/75">
                        of recent learners report stronger job-readiness after
                        completing their track.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { title: "Data Analytics", accent: "bg-brand-sky" },
                    { title: "Web Development", accent: "bg-brand-coral" },
                    { title: "AI & Automation", accent: "bg-brand-gold" },
                    { title: "Mobile App Dev", accent: "bg-brand-green" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-white/10 bg-white/10 p-4 sm:p-5"
                    >
                      <div className={`h-1.5 w-14 rounded-full ${item.accent}`} />
                      <p className="mt-4 font-display text-lg font-bold text-white sm:mt-5 sm:text-xl">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm text-white/70">
                        Live sessions, projects, mentorship, and certification.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -top-3 right-4 rounded-full bg-white/10 px-3 py-2.5 backdrop-blur sm:-top-4 sm:right-6 sm:px-4 sm:py-3">
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
