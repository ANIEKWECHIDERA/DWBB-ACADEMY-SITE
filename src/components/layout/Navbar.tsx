import { AnimatePresence, motion } from "framer-motion";
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

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  const coursesTone = scrolled ? "text-white/80 hover:text-white" : "text-slate-800/90 hover:text-slate-950";
  const mobileButtonTone = scrolled
    ? "border-white/20 bg-white/10 text-white"
    : "border-slate-900/10 bg-slate-950 text-white";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "bg-deep-blue/95 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="container-shell">
        <div className="flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo light={scrolled} imageClassName="h-12 sm:h-14" />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.slice(0, 2).map((link) => (
              <NavItem key={link.to} light={scrolled} to={link.to} label={link.label} />
            ))}

            <div className="relative">
              <button
                type="button"
                className={cn("flex items-center gap-2 text-sm font-medium transition-colors", coursesTone)}
                onClick={() => setCoursesOpen((current) => !current)}
                onBlur={() => window.setTimeout(() => setCoursesOpen(false), 150)}
              >
                Courses <ChevronDown className="h-4 w-4" />
              </button>
              {coursesOpen ? (
                <div className="absolute left-1/2 top-10 w-72 -translate-x-1/2 rounded-[24px] border border-white/10 bg-deep-blue p-3">
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
              <NavItem key={link.to} light={scrolled} to={link.to} label={link.label} />
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
            className={cn(
              "grid h-11 w-11 place-items-center rounded-full transition-colors lg:hidden",
              mobileButtonTone,
            )}
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {mobileOpen ? (
          <motion.div
            key="mobile-menu"
            className="fixed inset-0 z-50 bg-deep-blue/95 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <motion.div
              className="container-shell py-6"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-bold text-white">Menu</span>
                <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="mt-10 space-y-3">
                {[...navLinks.slice(0, 2), ...courseLinks, ...navLinks.slice(2)].map((link, index) => (
                  <motion.div
                    key={link.to}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <Link
                      to={link.to}
                      className="block rounded-3xl border border-white/10 px-5 py-4 text-white/80 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2, delay: 0.21 }}
                >
                  <Button asChild className="mt-4 w-full" variant="gold">
                    <a
                      href={buildWhatsAppUrl("Hello DWBB Academy! I'm interested in your courses. Can you help me get started?")}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setMobileOpen(false)}
                    >
                      Start Enrollment
                    </a>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function NavItem({ to, label, light }: { to: string; label: string; light: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "relative text-sm font-medium transition-colors",
          light ? "text-white/80 hover:text-white" : "text-slate-800/90 hover:text-slate-950",
          isActive && (light ? "text-white" : "text-slate-950"),
        )
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
