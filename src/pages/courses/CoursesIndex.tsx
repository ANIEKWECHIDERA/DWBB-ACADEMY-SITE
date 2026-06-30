import { useMemo, useState } from "react";

import { DigitalCourseStoreSection } from "@/components/sections/courses/DigitalCourseStoreSection";
import { CourseCard } from "@/components/shared/CourseCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { usePublicCourses } from "@/lib/public-courses";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const filters = ["All", "Technology", "Data", "Business"] as const;

export default function CoursesIndex() {
  const [active, setActive] = useState<(typeof filters)[number]>("All");
  const { courses } = usePublicCourses();

  const filteredCourses = useMemo(() => {
    if (active === "All") {
      return courses;
    }
    if (active === "Data") {
      return courses.filter((course) => ["data-analytics", "machine-learning"].includes(course.slug));
    }
    if (active === "Business") {
      return courses.filter((course) => course.slug === "ai-automation");
    }
    return courses.filter((course) => ["web-development", "mobile-app"].includes(course.slug));
  }, [active]);

  return (
    <>
      <section className="bg-gradient-hero py-20 text-white">
        <div className="container-shell">
          <h1 className="text-5xl font-bold text-white sm:text-6xl">Build Skills That Pay</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/75">
            Choose from 5 intensive bootcamps designed to get you job-ready fast.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-shell">
          <SectionHeader eyebrow="Courses" heading="Find the right path for your next chapter" />
          <Tabs className="mt-10 justify-center" value={active} onChange={(value) => setActive(value as (typeof filters)[number])} items={[...filters]} />
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          <div className="mt-12 rounded-[32px] bg-gradient-cta px-6 py-8 text-center text-slate-950 shadow-soft">
            <p className="text-lg font-semibold">Not sure which course to take? Chat with our advisors on WhatsApp!</p>
            <Button asChild className="mt-5 bg-deep-blue text-white hover:bg-mid-blue">
              <a href={buildWhatsAppUrl()} target="_blank" rel="noreferrer">
                Talk to an Advisor
              </a>
            </Button>
          </div>
        </div>
      </section>

      <DigitalCourseStoreSection courses={courses} />
    </>
  );
}
