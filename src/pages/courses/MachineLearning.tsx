import { CoursePageTemplate } from "@/components/sections/courses/CoursePageTemplate";
import { courses } from "@/data/courses";

export default function MachineLearning() {
  return <CoursePageTemplate course={courses.find((course) => course.slug === "machine-learning")!} />;
}
