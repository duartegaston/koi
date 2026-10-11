import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = { title: "Contacto" };

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Contacto</h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Dejanos tu pedido. Después lo enviás por WhatsApp al número del local.
      </p>
      <ContactForm />
    </main>
  );
}
