import { AboutHeroSection } from "@/components/sections/about/AboutHeroSection";
import { MissionSection } from "@/components/sections/about/MissionSection";
import { TeamSection } from "@/components/sections/about/TeamSection";
import { ValuesSection } from "@/components/sections/about/ValuesSection";

export default function About() {
  return (
    <>
      <AboutHeroSection />
      <MissionSection />
      <ValuesSection />
      <TeamSection />
    </>
  );
}
