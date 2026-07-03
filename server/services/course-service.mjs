export function createCourseService({
  digitalCourseCatalog,
  findDigitalCourse,
  getManagedCourse,
  isFirebaseAdminConfigured,
  listManagedCourses,
  logServerError,
}) {
  async function listManagedCoursesSafe() {
    if (!isFirebaseAdminConfigured()) {
      return digitalCourseCatalog.map((course, index) => ({
        ...course,
        summary: "",
        longDescription: "",
        featured: true,
        published: true,
        order: index,
      }));
    }

    return listManagedCourses();
  }

  async function loadManagedCoursesForPublic() {
    try {
      return await listManagedCoursesSafe();
    } catch {
      return digitalCourseCatalog.map((course, index) => ({
        ...course,
        summary: "",
        longDescription: "",
        featured: true,
        published: true,
        order: index,
      }));
    }
  }

  async function getCourseForCheckout(slug) {
    if (isFirebaseAdminConfigured()) {
      try {
        const managedCourse = await getManagedCourse(slug);
        if (managedCourse) {
          return managedCourse;
        }
      } catch (error) {
        logServerError("Managed course lookup failed", error);
      }
    }

    return findDigitalCourse(slug);
  }

  function sanitizeCourseUpdates(payload) {
    const updates = {};

    if (typeof payload.slug === "string" && payload.slug.trim()) {
      updates.slug = payload.slug.trim();
    }
    if (typeof payload.title === "string") {
      updates.title = payload.title.trim();
    }
    if (typeof payload.shortTitle === "string") {
      updates.shortTitle = payload.shortTitle.trim();
    }
    if (typeof payload.summary === "string") {
      updates.summary = payload.summary;
    }
    if (typeof payload.longDescription === "string") {
      updates.longDescription = payload.longDescription;
    }
    if (typeof payload.priceNaira === "number") {
      updates.priceNaira = Math.max(Math.round(payload.priceNaira), 0);
    }
    if (Array.isArray(payload.deliverables)) {
      updates.deliverables = payload.deliverables
        .map((item) => String(item))
        .filter(Boolean);
    }
    if (typeof payload.published === "boolean") {
      updates.published = payload.published;
    }
    if (typeof payload.featured === "boolean") {
      updates.featured = payload.featured;
    }
    if (Array.isArray(payload.assets)) {
      updates.assets = payload.assets;
    }
    if (typeof payload.order === "number") {
      updates.order = payload.order;
    }

    return updates;
  }

  return {
    getCourseForCheckout,
    listManagedCoursesSafe,
    loadManagedCoursesForPublic,
    sanitizeCourseUpdates,
  };
}
