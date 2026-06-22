import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PurchaseCourseButton } from "@/components/commerce/PurchaseCourseButton";
import { courses } from "@/data/courses";

export function DigitalCourseStoreSection() {
  return (
    <section className="bg-white py-20" id="digital-course-store">
      <div className="container-shell">
        <SectionHeader
          eyebrow="Digital Course Store"
          heading="Buy courses directly and get instant downloadable access"
          subtext="Every course is available as a one-time digital purchase, powered by Paystack test checkout and backed by server-side payment verification."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-2xl">{course.icon}</div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-gold">{course.level}</p>
              </div>
              <h3 className="mt-6 text-2xl font-bold text-slate-950">{course.shortTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{course.tagline}</p>
              <p className="mt-5 text-3xl font-bold text-deep-blue">{course.price}</p>
              <p className="mt-1 text-sm text-slate-500">{course.priceUSD}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm leading-7 text-slate-600">
                {course.digitalDeliverables.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <PurchaseCourseButton className="mt-6 w-full" course={course} />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
