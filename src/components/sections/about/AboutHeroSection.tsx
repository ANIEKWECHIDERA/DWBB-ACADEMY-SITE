import { PetalOrb } from "@/components/shared/PetalOrb";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export function AboutHeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-16 text-white sm:py-20">
      <PetalOrb className="-right-10 top-0" size={420} blur={70} opacity={0.35} />
      <div className="container-shell relative">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About" }]} light />
        <h1 className="mt-6 max-w-4xl text-4xl font-bold text-white sm:mt-8 sm:text-6xl">We Exist to Unlock Human Potential</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-white/75 sm:mt-6 sm:text-lg sm:leading-8">
          DWBB Academy was founded with a single belief: that access to quality digital education should never be a barrier to success.
        </p>
      </div>
    </section>
  );
}
