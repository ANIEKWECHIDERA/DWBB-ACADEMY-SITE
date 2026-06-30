import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { CoursePageTemplate } from "@/components/sections/courses/CoursePageTemplate";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { usePublicCourse } from "@/lib/public-courses";
import NotFound from "@/pages/NotFound";

export default function CourseDetails() {
  const params = useParams();
  const slug = useMemo(() => params.slug || "", [params.slug]);
  const { course, loading } = usePublicCourse(slug);

  if (loading && !course) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gradient-hero text-white">
        <div className="space-y-3 text-center">
          <BrandLogo className="justify-center" imageClassName="h-24" withWordmark={false} />
          <p className="font-display text-lg">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return <NotFound />;
  }

  return <CoursePageTemplate course={course} />;
}
