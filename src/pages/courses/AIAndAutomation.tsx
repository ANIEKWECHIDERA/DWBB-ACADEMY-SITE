import { CoursePageTemplate } from "@/components/sections/courses/CoursePageTemplate";
import { courses } from "@/data/courses";

export default function AIAndAutomation() {
  return <CoursePageTemplate course={courses.find((course) => course.slug === "ai-automation")!} />;
}
