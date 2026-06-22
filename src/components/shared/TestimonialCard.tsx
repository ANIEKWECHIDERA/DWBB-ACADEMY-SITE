import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import type { Testimonial } from "@/types/course";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card className="h-full p-6">
      <div className="flex items-center gap-4">
        <Avatar initials={testimonial.avatarInitials} />
        <div>
          <p className="font-display text-lg font-semibold text-slate-950">{testimonial.name}</p>
          <p className="text-sm text-slate-500">{testimonial.role}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-brand-gold">{testimonial.course}</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-600">"{testimonial.text}"</p>
      <p className="mt-5 text-brand-gold">{"★".repeat(testimonial.rating)}</p>
    </Card>
  );
}
