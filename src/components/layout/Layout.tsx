import { Outlet } from "react-router-dom";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";

export function Layout() {
  return (
    <div className="min-h-screen bg-soft-sand">
      <Navbar />
      <main className="overflow-x-hidden pt-20">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
