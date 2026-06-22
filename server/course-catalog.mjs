import path from "node:path";

const contentDir = path.resolve(process.cwd(), "server/content");

export const digitalCourseCatalog = [
  {
    slug: "data-analytics",
    title: "Data Analytics Bootcamp",
    priceNaira: 250000,
    deliverables: [
      "Downloadable lesson guides and templates",
      "Practice datasets for portfolio projects",
      "Capstone workbook and review checklist",
    ],
    filePath: path.join(contentDir, "data-analytics-toolkit.txt"),
    fileName: "dwbb-data-analytics-toolkit.txt",
  },
  {
    slug: "web-development",
    title: "Web Development Bootcamp",
    priceNaira: 350000,
    deliverables: [
      "Project source files and starter templates",
      "UI kits and frontend deployment guides",
      "Portfolio launch checklist",
    ],
    filePath: path.join(contentDir, "web-development-starter-pack.txt"),
    fileName: "dwbb-web-development-starter-pack.txt",
  },
  {
    slug: "mobile-app",
    title: "Mobile App Development",
    priceNaira: 450000,
    deliverables: [
      "React Native starter kits and UI patterns",
      "Firebase integration walkthroughs",
      "App submission prep materials",
    ],
    filePath: path.join(contentDir, "mobile-app-development-pack.txt"),
    fileName: "dwbb-mobile-app-development-pack.txt",
  },
  {
    slug: "ai-automation",
    title: "AI & Automation",
    priceNaira: 180000,
    deliverables: [
      "Prompt packs and automation blueprints",
      "Workflow templates for common business use cases",
      "Implementation playbook for AI tools",
    ],
    filePath: path.join(contentDir, "ai-automation-playbook.txt"),
    fileName: "dwbb-ai-automation-playbook.txt",
  },
  {
    slug: "machine-learning",
    title: "Machine Learning",
    priceNaira: 600000,
    deliverables: [
      "Model notebooks and experiment templates",
      "Deployment starter guides and evaluation sheets",
      "Capstone submission framework",
    ],
    filePath: path.join(contentDir, "machine-learning-capstone-kit.txt"),
    fileName: "dwbb-machine-learning-capstone-kit.txt",
  },
];

export function findDigitalCourse(slug) {
  return digitalCourseCatalog.find((course) => course.slug === slug);
}
