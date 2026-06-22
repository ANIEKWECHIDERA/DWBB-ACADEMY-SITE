export interface CourseModule {
  week: number;
  title: string;
  topics: string[];
}

export interface CourseFaq {
  question: string;
  answer: string;
}

export type CourseColor = "coral" | "sky" | "green" | "gold";

export interface Course {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  longDescription: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  startDate: string;
  price: string;
  priceUSD: string;
  earlyBirdDiscount: string;
  color: CourseColor;
  icon: string;
  outcomes: string[];
  curriculum: CourseModule[];
  targetAudience: string[];
  careerPaths: string[];
  faqs: CourseFaq[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  course: string;
  text: string;
  rating: number;
  avatarInitials: string;
}
