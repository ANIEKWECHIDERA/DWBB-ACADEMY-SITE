import { ArrowRight, Compass, Home } from "lucide-react";
import { Link } from "react-router-dom";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { PetalOrb } from "@/components/shared/PetalOrb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-20 text-white sm:py-28">
      <PetalOrb className="-left-16 top-8" opacity={0.26} size={320} />
      <PetalOrb className="right-0 top-24" opacity={0.2} size={360} />

      <div className="container-shell relative">
        <Card className="mx-auto max-w-5xl overflow-hidden rounded-[40px] border border-white/10 bg-white/95 p-8 shadow-glow sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <BrandLogo className="justify-start" imageClassName="h-20" />
              <p className="mt-8 text-sm font-semibold uppercase tracking-[0.28em] text-brand-coral">
                404 Not Found
              </p>
              <h1 className="mt-4 max-w-2xl text-4xl font-bold text-slate-950 sm:text-5xl">
                This page took a wrong turn, but your digital journey is still
                on track.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                The page you requested does not exist or may have moved. You can
                head back home, explore our courses, or message the team
                directly and we will point you to the right place.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="gold">
                  <Link to="/">
                    Back Home <Home className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="border border-slate-200 bg-white"
                >
                  <Link to="/courses">
                    Explore Courses <Compass className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <Card className="rounded-[32px] border border-slate-200 bg-soft-sand p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Helpful Next Steps
              </p>
              <div className="mt-6 space-y-4 text-slate-700">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <p className="text-lg font-semibold text-slate-950">
                    Looking for a course page?
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Our main catalog has every program, tuition range, and
                    direct-purchase option in one place.
                  </p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <p className="text-lg font-semibold text-slate-950">
                    Need help from the team?
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Send a quick WhatsApp message and DWBB Academy will help you
                    find the exact page or program you need.
                  </p>
                </div>
              </div>

              <Button asChild className="mt-6 w-full" variant="default">
                <a
                  href={buildWhatsAppUrl(
                    "Hello DWBB Academy! I landed on a missing page and need help finding the right course or resource.",
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Chat on WhatsApp <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </Card>
          </div>
        </Card>
      </div>
    </section>
  );
}
