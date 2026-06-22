import { CalendarDays, Clock3, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PurchaseCourseButton } from "@/components/commerce/PurchaseCourseButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Course } from "@/types/course";

export function CourseCard({ course }: { course: Course }) {
  return (
    <Card className="group flex h-full flex-col p-6 hover:-translate-y-1 hover:bg-slate-50">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-2xl">{course.icon}</div>
        <Badge className="border-slate-200 bg-slate-50 text-slate-600">{course.level}</Badge>
      </div>
      <h3 className="mt-6 text-2xl font-bold text-slate-950">{course.shortTitle}</h3>
      <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{course.description}</p>
      <Separator className="my-5" />
      <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-brand-coral" />
          <span>{course.duration}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand-sky" />
          <span>{course.startDate}</span>
        </div>
      </div>
      <p className="mt-5 text-lg font-semibold text-deep-blue">
        {course.price} <span className="text-sm font-normal text-slate-500">| {course.priceUSD}</span>
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="ghost" className="rounded-full border border-slate-200">
          <Link to={`/courses/${course.slug}`}>
            Learn More <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <PurchaseCourseButton course={course} label="Buy Now" />
      </div>
    </Card>
  );
}
