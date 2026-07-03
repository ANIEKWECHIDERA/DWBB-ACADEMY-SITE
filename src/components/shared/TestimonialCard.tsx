import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import type { Testimonial } from "@/types/course";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card className="h-full p-5 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Avatar
          alt={testimonial.name}
          initials={testimonial.avatarInitials}
          src={testimonial.imageUrl}
        />
        <div>
          <p className="font-display text-base font-semibold text-slate-950 sm:text-lg">{testimonial.name}</p>
          <p className="text-sm text-slate-500">{testimonial.role}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-brand-gold">{testimonial.course}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600 sm:mt-5 sm:leading-7">"{testimonial.text}"</p>
      <p className="mt-4 text-brand-gold sm:mt-5">{"★".repeat(testimonial.rating)}</p>
    </Card>
  );
}
