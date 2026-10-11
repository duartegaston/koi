"use server";

import { z } from "zod";
import { getDb, schema } from "@/db";
import { sendEmail } from "@/lib/email/resend";
import { contactConfirmationEmail } from "@/lib/email/templates";
import { getServerEnv } from "@/lib/env";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";

export type ContactFormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<keyof ContactInput, string[]>>;
      values?: Partial<ContactInput>;
    };

export async function submitContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: raw,
    };
  }

  let contact;
  try {
    [contact] = await getDb()
      .insert(schema.contactMessages)
      .values(parsed.data)
      .returning({
        id: schema.contactMessages.id,
        name: schema.contactMessages.name,
        email: schema.contactMessages.email,
        phone: schema.contactMessages.phone,
        message: schema.contactMessages.message,
      });
  } catch (error) {
    console.error("Error guardando mensaje de contacto", error);
  }

  if (!contact) {
    return { status: "error", message: "No pudimos guardar tu mensaje.", values: raw };
  }

  const { WHATSAPP_CONTACT_TEMPLATE } = getServerEnv();
  const email = contactConfirmationEmail(contact);

  // Las notificaciones no deben hacer fallar el envío ya persistido.
  const results = await Promise.allSettled([
    sendEmail({ to: contact.email, ...email }),
    contact.phone && WHATSAPP_CONTACT_TEMPLATE
      ? sendWhatsAppTemplate(contact.phone, WHATSAPP_CONTACT_TEMPLATE, [contact.name])
      : Promise.resolve(null),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Error enviando notificación de contacto", result.reason);
    }
  }

  return { status: "success", message: "¡Gracias! Recibimos tu mensaje." };
}
