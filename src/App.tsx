import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Layout } from "@/components/layout/Layout";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { BrandLogo } from "@/components/shared/BrandLogo";

const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const Contact = lazy(() => import("@/pages/Contact"));
const CoursesIndex = lazy(() => import("@/pages/courses/CoursesIndex"));
const DataAnalytics = lazy(() => import("@/pages/courses/DataAnalytics"));
const WebDevelopment = lazy(() => import("@/pages/courses/WebDevelopment"));
const MobileAppDevelopment = lazy(() => import("@/pages/courses/MobileAppDevelopment"));
const AIAndAutomation = lazy(() => import("@/pages/courses/AIAndAutomation"));
const MachineLearning = lazy(() => import("@/pages/courses/MachineLearning"));

const fallback = (
  <div className="flex min-h-screen items-center justify-center bg-deep-blue text-white">
    <div className="space-y-3 text-center">
      <BrandLogo className="justify-center" imageClassName="h-24" withWordmark={false} />
      <p className="font-display text-lg">Loading DWBB Academy...</p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={fallback}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/courses" element={<CoursesIndex />} />
            <Route path="/courses/data-analytics" element={<DataAnalytics />} />
            <Route path="/courses/web-development" element={<WebDevelopment />} />
            <Route path="/courses/mobile-app" element={<MobileAppDevelopment />} />
            <Route path="/courses/ai-automation" element={<AIAndAutomation />} />
            <Route path="/courses/machine-learning" element={<MachineLearning />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/contact" element={<Contact />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
