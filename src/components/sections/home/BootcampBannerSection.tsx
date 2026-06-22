import { PetalOrb } from "@/components/shared/PetalOrb";
import { Button } from "@/components/ui/button";
import { buildBootcampEnquiryUrl } from "@/lib/whatsapp";

export function BootcampBannerSection() {
  return (
    <section className="pb-20">
      <div className="container-shell">
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-hero px-6 py-10 text-white shadow-glow sm:px-10">
          <PetalOrb className="-right-16 top-0" size={380} blur={70} opacity={0.35} />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-gold">Join Our Next Cohort</p>
              <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">6 Weeks Intensive Data Analytics Bootcamp</h2>
              <p className="mt-3 text-lg text-white/75">Starting: July 6, 2026</p>
              <p className="mt-2 text-xl font-semibold text-brand-gold">N60,000 | $50</p>
            </div>
            <div className="relative flex flex-col items-start gap-4 lg:items-end">
              <div className="rounded-full bg-brand-coral px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">
                10% Off for Early Birds - First 3 Enrollees
              </div>
              <Button asChild variant="gold">
                <a href={buildBootcampEnquiryUrl()} target="_blank" rel="noreferrer">
                  Enroll via WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
