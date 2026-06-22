import { AtSign, BriefcaseBusiness, Globe, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

const courseLinks = [
  { label: "Data Analytics", to: "/courses/data-analytics" },
  { label: "Web Development", to: "/courses/web-development" },
  { label: "Mobile App Dev", to: "/courses/mobile-app" },
  { label: "AI & Automation", to: "/courses/ai-automation" },
  { label: "Machine Learning", to: "/courses/machine-learning" },
];

const socialLinks = [
  { icon: Globe, href: "https://facebook.com/dwbbacademy", label: "Facebook" },
  { icon: AtSign, href: "https://instagram.com/dwbbacademy", label: "Instagram" },
  { icon: PlayCircle, href: "https://youtube.com/@dwbbacademy", label: "YouTube" },
  { icon: BriefcaseBusiness, href: "https://linkedin.com/company/dwbbacademy", label: "LinkedIn" },
];

export function Footer() {
  return (
    <footer className="bg-deep-blue text-white">
      <div className="container-shell py-16">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <BrandLogo light imageClassName="h-16" />
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
              Hands-on bootcamps in analytics, development, AI, and emerging digital skills built for ambitious African talent.
            </p>
            <div className="mt-5 flex gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 hover:bg-white/10 hover:text-white"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Quick Links" links={quickLinks} />
          <FooterColumn title="Courses" links={courseLinks} />

          <div>
            <p className="font-display text-lg font-semibold">Contact</p>
            <div className="mt-5 space-y-3 text-sm text-white/70">
              <p>+234 810 625 8080</p>
              <p>@dwbbacademy</p>
              <p>Monday - Friday, 9am - 6pm WAT</p>
            </div>
            <Button asChild className="mt-6" variant="gold">
              <a href={buildWhatsAppUrl()} target="_blank" rel="noreferrer">
                Chat on WhatsApp
              </a>
            </Button>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/50 md:flex-row md:items-center md:justify-between">
          <p>© 2026 DWBB Academy. All rights reserved.</p>
          <div className="flex gap-5">
            <span>Privacy Policy</span>
            <span>Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <p className="font-display text-lg font-semibold">{title}</p>
      <div className="mt-5 space-y-3">
        {links.map((link) => (
          <Link key={link.to} className="block text-sm text-white/70 hover:text-white" to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
