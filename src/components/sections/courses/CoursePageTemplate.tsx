import { CheckCircle2, ArrowRight, CalendarDays, Clock3, BriefcaseBusiness } from "lucide-react";

import { PurchaseCourseButton } from "@/components/commerce/PurchaseCourseButton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildCourseEnquiryUrl } from "@/lib/whatsapp";
import type { Course } from "@/types/course";

export function CoursePageTemplate({ course }: { course: Course }) {
  return (
    <div>
      <section className="bg-gradient-hero py-14 text-white sm:py-16">
        <div className="container-shell">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Courses", href: "/courses" }, { label: course.shortTitle }]} light />
          <div className="mt-8 grid gap-8 sm:mt-10 sm:gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Badge>{course.level}</Badge>
              <h1 className="mt-4 text-4xl font-bold text-white sm:mt-5 sm:text-6xl">{course.title}</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">{course.tagline}</p>
              <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
                <QuickStat icon={<Clock3 className="h-5 w-5 text-brand-coral" />} label="Duration" value={course.duration} />
                <QuickStat icon={<CalendarDays className="h-5 w-5 text-brand-sky" />} label="Start Date" value={course.startDate} />
                <QuickStat icon={<BriefcaseBusiness className="h-5 w-5 text-brand-gold" />} label="Price" value={course.price} />
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:gap-4 sm:flex-row">
                <PurchaseCourseButton course={course} className="justify-center" label="Buy Digital Course" />
                <Button asChild variant="outline">
                  <a href={buildCourseEnquiryUrl(course.title)} target="_blank" rel="noreferrer">
                    Ask a Question <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <Card className="grid min-h-[280px] place-items-center bg-white/10 p-6 text-center backdrop-blur sm:min-h-[320px] sm:p-10">
              <div>
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white/10 text-5xl sm:h-28 sm:w-28 sm:text-6xl">{course.icon}</div>
                <p className="mt-6 text-base leading-7 text-white/75 sm:mt-8 sm:text-lg sm:leading-8">{course.longDescription}</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container-shell">
          <SectionHeader eyebrow="What You'll Learn" heading={`Real outcomes from ${course.shortTitle}`} centered={false} />
          <div className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-2 xl:grid-cols-3">
            {course.outcomes.map((outcome) => (
              <Card key={outcome} className="flex items-start gap-4 p-5">
                <CheckCircle2 className="mt-1 h-5 w-5 text-brand-green" />
                <p className="text-sm leading-7 text-slate-700">{outcome}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container-shell">
          <SectionHeader eyebrow="Curriculum" heading="Week-by-week course roadmap" />
          <div className="mt-8 sm:mt-10">
            <Accordion
              items={course.curriculum.map((module) => ({
                value: String(module.week),
                trigger: `Week ${module.week}: ${module.title}`,
                content: (
                  <ul className="space-y-2">
                    {module.topics.map((topic) => (
                      <li key={topic}>• {topic}</li>
                    ))}
                  </ul>
                ),
              }))}
            />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container-shell grid gap-8 sm:gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <SectionHeader eyebrow="Who It's For" heading="Built for motivated learners" centered={false} />
            <div className="mt-6 grid gap-4 sm:mt-8">
              {course.targetAudience.map((item) => (
                <Card key={item} className="p-5 text-sm leading-7 text-slate-700">
                  {item}
                </Card>
              ))}
            </div>
          </div>
          <div>
            <SectionHeader eyebrow="Career Paths" heading="Before learning, after confidence" centered={false} />
            <Card className="mt-6 p-5 sm:mt-8 sm:p-6">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Readiness Progress</p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                    <span>From curiosity</span>
                    <span>20%</span>
                  </div>
                  <Progress value={20} />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                    <span>To project confidence</span>
                    <span>85%</span>
                  </div>
                  <Progress value={85} />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {course.careerPaths.map((path) => (
                  <Badge key={path} className="border-slate-200 bg-slate-50 text-slate-700">
                    {path}
                  </Badge>
                ))}
              </div>
            </Card>
            <Card className="mt-5 p-5 sm:mt-6 sm:p-6">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Instructor Profile</p>
              <h3 className="mt-3 text-2xl font-bold text-slate-950">{course.shortTitle} Mentor Team</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Learn from practitioners who actively build, consult, and mentor in this space. Sessions blend structured teaching with direct feedback and portfolio guidance.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container-shell grid gap-6 sm:gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="h-fit p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">Pricing & Enrollment</p>
            <p className="mt-4 text-3xl font-bold text-deep-blue sm:text-4xl">{course.price}</p>
            {course.priceUSD ? <p className="mt-1 text-slate-500">{course.priceUSD}</p> : null}
            <div className="mt-6 rounded-3xl bg-brand-gold/15 px-4 py-4 text-sm font-semibold text-slate-800">
              {course.earlyBirdDiscount}
            </div>
            <div className="mt-4 rounded-3xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
              Includes instant access to downloadable learning materials and confirmation by email after verified payment.
            </div>
            <div className="mt-6 grid gap-3">
              <PurchaseCourseButton course={course} className="w-full" label="Buy Digital Course" />
              <Button asChild variant="ghost" className="rounded-full border border-slate-200">
                <a href={buildCourseEnquiryUrl(course.title)} target="_blank" rel="noreferrer">
                  Ask a Question via WhatsApp
                </a>
              </Button>
            </div>
          </Card>
          <div>
            <SectionHeader eyebrow="FAQs" heading="Answers to common enrollment questions" centered={false} />
            <div className="mt-6 sm:mt-8">
              <Accordion
                items={course.faqs.map((faq, index) => ({
                  value: `${course.slug}-${index}`,
                  trigger: faq.question,
                  content: faq.answer,
                }))}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
      <div className="flex items-center gap-3">{icon}<span className="text-sm uppercase tracking-[0.14em] text-white/65">{label}</span></div>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
