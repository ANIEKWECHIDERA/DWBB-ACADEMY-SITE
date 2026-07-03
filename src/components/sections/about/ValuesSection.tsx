import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";

const values = [
  { title: "Excellence", description: "We maintain the highest standards in everything we deliver." },
  { title: "Accessibility", description: "Quality education for everyone, regardless of background." },
  { title: "Community", description: "Learning is better together; we build a global network." },
  { title: "Impact", description: "Every course is designed to produce measurable life changes." },
];

export function ValuesSection() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-shell">
        <SectionHeader eyebrow="Values" heading="What guides the way we teach and build" />
        <div className="mt-10 grid gap-5 sm:mt-12 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          {values.map((value) => (
            <Card key={value.title} className="p-5 sm:p-6">
              <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">{value.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{value.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
