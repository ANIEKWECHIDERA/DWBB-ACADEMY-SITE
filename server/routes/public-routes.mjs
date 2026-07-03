import { getCheckoutPricing } from "../../src/lib/paystackPricing.js";

export function registerPublicRoutes(app, { courseService, formatNaira }) {
  app.get("/api/health", (req, res) => {
    const payload = {
      ok: true,
      status: "healthy",
      service: "dwbb-academy-server",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      requestId: req.requestId || null,
    };

    req.requestLogger?.info("health.check", payload);
    res.json(payload);
  });

  app.get("/api/store/courses", async (_req, res) => {
    const managedCourses = await courseService.loadManagedCoursesForPublic();

    res.json({
      courses: managedCourses.map((course) => {
        const checkoutPricing = getCheckoutPricing(course.priceNaira);

        return {
          checkoutPrice: formatNaira(checkoutPricing.totalChargeNaira),
          checkoutPriceNaira: checkoutPricing.totalChargeNaira,
          processingFee: formatNaira(checkoutPricing.processingFeeNaira),
          processingFeeNaira: checkoutPricing.processingFeeNaira,
          templateSlug: course.templateSlug || course.slug,
          slug: course.slug,
          shortTitle: course.shortTitle || "",
          title: course.title,
          summary: course.summary || "",
          longDescription: course.longDescription || "",
          deliverables: course.deliverables || [],
          published: course.published !== false,
          featured: course.featured !== false,
          order: Number(course.order || 0),
          priceNaira: course.priceNaira,
          price: formatNaira(course.priceNaira),
        };
      }),
    });
  });
}
