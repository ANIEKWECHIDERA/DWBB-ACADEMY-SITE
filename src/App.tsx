import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Layout } from "@/components/layout/Layout";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { BrandLogo } from "@/components/shared/BrandLogo";

const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const AdminConsole = lazy(() => import("@/pages/admin/AdminConsole"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const Contact = lazy(() => import("@/pages/Contact"));
const CourseDetails = lazy(() => import("@/pages/courses/CourseDetails"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PaymentConsole = lazy(() => import("@/pages/PaymentConsole"));
const PaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));
const CoursesIndex = lazy(() => import("@/pages/courses/CoursesIndex"));
const paymentDebugEnabled = import.meta.env.VITE_ENABLE_PAYMENT_DEBUG === "true";

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
          <Route path="/admin" element={<AdminConsole />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/courses" element={<CoursesIndex />} />
            <Route path="/courses/:slug" element={<CourseDetails />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            {paymentDebugEnabled ? <Route path="/payments/console" element={<PaymentConsole />} /> : null}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
