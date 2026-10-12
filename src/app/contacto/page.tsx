import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = { title: "Contacto" };

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-lg px-6 py-16 md:py-24">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Contacto</p>
      <h1 className="mt-3 text-5xl uppercase leading-none md:text-6xl">Escribinos</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Dejanos tu mensaje. Después lo enviás por WhatsApp al número del local.
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </section>
  );
}
