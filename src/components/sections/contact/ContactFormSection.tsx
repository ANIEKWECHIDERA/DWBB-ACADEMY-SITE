import { useState, type FormEvent } from "react";
import { AtSign, BriefcaseBusiness, Globe, MessageCircle, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { courses } from "@/data/courses";
import { buildContactFormMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const initialState = {
  fullName: "",
  email: "",
  phone: "",
  course: "General Enquiry",
  message: "",
};

export function ContactFormSection() {
  const [form, setForm] = useState(initialState);
  const { pushToast } = useToast();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const url = buildContactFormMessage(form);
    window.open(url, "_blank", "noopener,noreferrer");
    pushToast({
      title: "Your message was sent!",
      description: "We'll get back to you within 2 hours.",
    });
    setForm(initialState);
  };

  return (
    <section className="py-16 sm:py-20">
      <div className="container-shell grid gap-6 sm:gap-8 lg:grid-cols-2">
        <Card className="p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">Contact Info</p>
          <a className="mt-5 inline-flex items-center gap-3 font-display text-2xl font-bold text-deep-blue sm:text-3xl" href={buildWhatsAppUrl()} target="_blank" rel="noreferrer">
            <MessageCircle className="h-7 w-7 text-[#25D366] sm:h-8 sm:w-8" />
            +234 810 625 8080
          </a>
          <div className="mt-8 space-y-3 text-slate-600">
            <p>@dwbbacademy</p>
            <p>Monday - Friday, 9am - 6pm WAT</p>
            <p>We respond to all enquiries within 2 hours</p>
          </div>
          <div className="mt-8 flex gap-3 text-slate-500">
            <Globe className="h-5 w-5" />
            <AtSign className="h-5 w-5" />
            <PlayCircle className="h-5 w-5" />
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" required value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </div>
            <div>
              <Label htmlFor="course">Course of Interest</Label>
              <Select id="course" value={form.course} onChange={(event) => setForm((current) => ({ ...current, course: event.target.value }))}>
                <option>General Enquiry</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.title}>
                    {course.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea id="message" required value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} />
            </div>
            <Button className="w-full" type="submit" variant="gold">
              Send Message
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
