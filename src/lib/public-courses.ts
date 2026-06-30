import { useEffect, useState } from "react";

import { courses as staticCourses } from "@/data/courses";
import { apiUrl } from "@/lib/api";
import type { Course } from "@/types/course";

interface PublicCoursePayload {
  checkoutPriceNaira?: number;
  deliverables?: string[];
  featured?: boolean;
  longDescription?: string;
  order?: number;
  priceNaira: number;
  processingFeeNaira?: number;
  published?: boolean;
  shortTitle?: string;
  slug: string;
  summary?: string;
  templateSlug?: string;
  title: string;
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("NGN", "N")
    .trim();
}

function mergePublicCourse(payload: PublicCoursePayload): Course | null {
  const template = staticCourses.find((course) => course.slug === (payload.templateSlug || payload.slug));

  if (!template) {
    return null;
  }

  const summary = payload.summary?.trim();
  const longDescription = payload.longDescription?.trim();
  const priceChanged = payload.priceNaira !== template.priceNaira;

  return {
    ...template,
    slug: payload.slug,
    templateSlug: payload.templateSlug || template.slug,
    title: payload.title || template.title,
    shortTitle: payload.shortTitle || template.shortTitle,
    tagline: summary || template.tagline,
    description: summary || template.description,
    longDescription: longDescription || template.longDescription,
    priceNaira: payload.priceNaira,
    price: formatNaira(payload.priceNaira),
    priceUSD: priceChanged ? "" : template.priceUSD,
    featured: payload.featured !== false,
    order: Number(payload.order || 0),
    processingFeeNaira: payload.processingFeeNaira,
    published: payload.published !== false,
    digitalDeliverables: payload.deliverables?.length ? payload.deliverables : template.digitalDeliverables,
  };
}

export async function fetchPublicCourses() {
  const response = await fetch(apiUrl("/api/store/courses"));
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to load courses.");
  }

  return (payload.courses || [])
    .map((course: PublicCoursePayload) => mergePublicCourse(course))
    .filter(Boolean)
    .sort((first: Course, second: Course) => Number(first.order || 0) - Number(second.order || 0));
}

export function usePublicCourses() {
  const [courses, setCourses] = useState<Course[]>(() => staticCourses);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const nextCourses = await fetchPublicCourses();
        if (active && nextCourses.length > 0) {
          setCourses(nextCourses.filter((course: Course) => course.published !== false));
        }
      } catch {
        if (active) {
          setCourses(staticCourses);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return { courses, loading };
}

export function usePublicCourse(slug: string) {
  const { courses, loading } = usePublicCourses();
  return {
    course: courses.find((course) => course.slug === slug) || null,
    loading,
  };
}
