import { BlogPreviewSection } from "@/components/sections/home/BlogPreviewSection";
import { BootcampBannerSection } from "@/components/sections/home/BootcampBannerSection";
import { FeaturedCoursesSection } from "@/components/sections/home/FeaturedCoursesSection";
import { HeroSection } from "@/components/sections/home/HeroSection";
import { HowItWorksSection } from "@/components/sections/home/HowItWorksSection";
import { TestimonialsSection } from "@/components/sections/home/TestimonialsSection";
import { TrustedBySection } from "@/components/sections/home/TrustedBySection";
import { WhyDWBBSection } from "@/components/sections/home/WhyDWBBSection";
import { usePublicCourses } from "@/lib/public-courses";

export default function Home() {
  const { courses } = usePublicCourses();

  return (
    <>
      <HeroSection />
      <TrustedBySection />
      <WhyDWBBSection />
      <FeaturedCoursesSection courses={courses} />
      <HowItWorksSection />
      <TestimonialsSection />
      <BootcampBannerSection />
      <BlogPreviewSection />
    </>
  );
}
