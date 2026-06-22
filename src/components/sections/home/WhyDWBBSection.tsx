import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";

const features = [
  { icon: "🎯", title: "Practical, Project-Based Learning", description: "Every course includes real-world projects you can add to your portfolio." },
  { icon: "👨‍🏫", title: "Expert-Led Instruction", description: "Learn from industry professionals with proven track records." },
  { icon: "📜", title: "Certifications Recognized Globally", description: "Our certificates validate skills for local and international opportunities." },
  { icon: "🤝", title: "Mentorship & Community", description: "Access a global network of learners, mentors, and alumni." },
  { icon: "💻", title: "Learn from Anywhere", description: "Flexible learning designed for students, professionals, and entrepreneurs." },
  { icon: "🚀", title: "Career Advancement Support", description: "CV review, interview prep, and job-placement guidance included." },
];

export function WhyDWBBSection() {
  return (
    <section className="py-20">
      <div className="container-shell">
        <SectionHeader
          eyebrow="Why DWBB"
          heading="Why Choose DWBB Academy?"
          subtext="We don't just teach - we transform. Here's what sets us apart."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="p-6">
              <div className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-2xl">{feature.icon}</div>
              <h3 className="mt-5 text-xl font-bold text-slate-950">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
