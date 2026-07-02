import { MessageCircle } from "lucide-react";

import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function WhatsAppButton() {
  return (
    <a
      aria-label="Contact us on WhatsApp"
      className="group fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white"
      href={buildWhatsAppUrl()}
      target="_blank"
      rel="noreferrer"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="pointer-events-none absolute right-16 hidden rounded-full bg-deep-blue px-3 py-2 text-xs font-semibold text-white group-hover:block">
        Chat with us
      </span>
    </a>
  );
}
