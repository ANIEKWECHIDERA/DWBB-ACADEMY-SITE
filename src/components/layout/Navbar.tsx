import { Menu, X, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const courseLinks = [
  { label: "Data Analytics", to: "/courses/data-analytics" },
  { label: "Web Development", to: "/courses/web-development" },
  { label: "Mobile App Development", to: "/courses/mobile-app" },
  { label: "AI & Automation", to: "/courses/ai-automation" },
  { label: "Machine Learning", to: "/courses/machine-learning" },
];

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "bg-deep-blue/95 shadow-soft backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="container-shell">
        <div className="flex h-20 items-center justify-between text-white">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo light imageClassName="h-12 sm:h-14" />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.slice(0, 2).map((link) => (
              <NavItem key={link.to} to={link.to} label={link.label} />
            ))}

            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white"
                onClick={() => setCoursesOpen((current) => !current)}
                onBlur={() => window.setTimeout(() => setCoursesOpen(false), 150)}
              >
                Courses <ChevronDown className="h-4 w-4" />
              </button>
              {coursesOpen ? (
                <div className="absolute left-1/2 top-10 w-72 -translate-x-1/2 rounded-[24px] border border-white/10 bg-deep-blue p-3 shadow-glow">
                  {courseLinks.map((link) => (
                    <Link
                      key={link.to}
                      className="block rounded-2xl px-4 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                      to={link.to}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {navLinks.slice(2).map((link) => (
              <NavItem key={link.to} to={link.to} label={link.label} />
            ))}
          </nav>

          <div className="hidden lg:block">
            <Button asChild variant="gold">
              <a href={buildWhatsAppUrl("Hello DWBB Academy! I'm interested in your courses. Can you help me get started?")} target="_blank" rel="noreferrer">
                Enroll Now
              </a>
            </Button>
          </div>

          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/20 lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-deep-blue/95 backdrop-blur">
          <div className="container-shell py-6">
            <div className="flex items-center justify-between">
              <span className="font-display text-xl font-bold text-white">Menu</span>
              <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="mt-10 space-y-3">
              {[...navLinks.slice(0, 2), ...courseLinks, ...navLinks.slice(2)].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block rounded-3xl border border-white/10 px-5 py-4 text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild className="mt-4 w-full" variant="gold">
                <a href={buildWhatsAppUrl("Hello DWBB Academy! I'm interested in your courses. Can you help me get started?")} target="_blank" rel="noreferrer">
                  Start Enrollment
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn("relative text-sm font-medium text-white/80 hover:text-white", isActive && "text-white")
      }
    >
      {({ isActive }) => (
        <>
          {label}
          <span
            className={cn(
              "absolute -bottom-2 left-0 h-0.5 bg-brand-gold transition-all",
              isActive ? "w-full" : "w-0",
            )}
          />
        </>
      )}
    </NavLink>
  );
}
