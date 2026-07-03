import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { team } from "@/data/team";

export function TeamSection() {
  return (
    <section className="pb-16 sm:pb-20">
      <div className="container-shell">
        <SectionHeader eyebrow="Team" heading="The mentors behind the transformation" />
        <div className="mt-10 grid gap-5 sm:mt-12 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          {team.map((member) => (
            <Card key={member.id} className="p-5 sm:p-6">
              <Avatar
                alt={member.name}
                className="h-14 w-14 text-base sm:h-16 sm:w-16"
                initials={member.avatarInitials}
                src={member.imageUrl}
              />
              <h3 className="mt-4 text-lg font-bold text-slate-950 sm:mt-5 sm:text-xl">{member.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{member.role}</p>
              <Badge className="mt-4 border-slate-200 bg-slate-50 text-slate-600">{member.specialization}</Badge>
              <p className="mt-4 text-sm leading-7 text-slate-600">{member.bio}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
