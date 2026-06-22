import { SectionHeader } from "@/components/shared/SectionHeader";
import { TestimonialCard } from "@/components/shared/TestimonialCard";
import { testimonials } from "@/data/testimonials";

export function TestimonialsSection() {
  return (
    <section className="py-20">
      <div className="container-shell">
        <SectionHeader eyebrow="Success Stories" heading="What our learners say after the transformation" />
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.slice(0, 3).map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
