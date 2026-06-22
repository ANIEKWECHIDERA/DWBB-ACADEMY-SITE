import { Link } from "react-router-dom";

import { CourseCard } from "@/components/shared/CourseCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { courses } from "@/data/courses";

export function FeaturedCoursesSection() {
  return (
    <section className="pb-20">
      <div className="container-shell">
        <SectionHeader
          eyebrow="Popular Tracks"
          heading="Our Most Popular Courses"
          subtext="Choose a path that fits your goals. All courses are beginner-friendly."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="ghost" className="rounded-full border border-slate-200 bg-white">
            <Link to="/courses">View All Courses</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
