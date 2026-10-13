import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { pageMetadata } from "@/lib/seo";
import { contactDescription, contactTitle } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: contactTitle,
  description: contactDescription,
  path: "/contacto",
});

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-lg px-6 py-16 md:py-24">
      <p className="font-label text-sm tracking-wide text-muted">Contacto</p>
      <h1 className="mt-3 text-5xl md:text-6xl">Escribinos</h1>
      <p className="mt-4 text-base leading-relaxed text-muted">
        Dejanos tu mensaje. Después lo enviás por WhatsApp al número del local.
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </section>
  );
}
