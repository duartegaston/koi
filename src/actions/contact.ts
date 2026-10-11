"use server";

import { z } from "zod";
import { insertContactMessage } from "@/data-access/contact.repository";
import { sendEmail } from "@/lib/email/resend";
import { contactConfirmationEmail } from "@/lib/email/templates";
import { getServerEnv } from "@/lib/env";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import { contactWhatsAppText, whatsAppLink } from "@/lib/whatsapp/link";

export type ContactFormState =
  | { status: "idle" }
  | { status: "success"; message: string; whatsAppUrl: string }
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

  const whatsAppUrl = whatsAppLink(
    getServerEnv().WHATSAPP_NUMBER,
    contactWhatsAppText(parsed.data),
  );

  let saved = false;
  try {
    await insertContactMessage(parsed.data);
    saved = true;
  } catch (error) {
    console.error("Error guardando mensaje de contacto", error);
  }

  if (saved) {
    const email = contactConfirmationEmail(parsed.data);
    const result = await Promise.allSettled([sendEmail({ to: parsed.data.email, ...email })]);
    for (const item of result) {
      if (item.status === "rejected") {
        console.error("Error enviando email de contacto", item.reason);
      }
    }
  }

  return {
    status: "success",
    message: saved
      ? "Guardamos tu pedido. Enviá el mensaje por WhatsApp para que lo reciba el local."
      : "No pudimos guardarlo en la base. Igual podés enviarlo por WhatsApp.",
    whatsAppUrl,
  };
}
