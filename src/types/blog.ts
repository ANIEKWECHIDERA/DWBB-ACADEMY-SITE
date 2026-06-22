import type { CourseColor } from "@/types/course";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: "Data Analytics" | "AI" | "Career Tips" | "Web Dev";
  date: string;
  readTime: string;
  color: CourseColor;
  body: string[];
}
