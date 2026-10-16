"use server";

import { z } from "zod";
import { insertContactMessage } from "@/data-access/contact.repository";
import { errorCode } from "@/lib/error-code";
import { getServerEnv } from "@/lib/env";
import { allowClient } from "@/lib/rate-limit";
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

  if (!(await allowClient("contact"))) {
    return {
      status: "error",
      message: "Recibimos muchos mensajes desde esta conexión. Esperá unos minutos.",
      values: raw,
    };
  }

  const whatsAppUrl = whatsAppLink(getServerEnv().WHATSAPP_NUMBER, contactWhatsAppText(parsed.data));

  let saved = false;
  try {
    await insertContactMessage(parsed.data);
    saved = true;
  } catch (error) {
    console.error("Error guardando mensaje de contacto", errorCode(error));
  }

  return {
    status: "success",
    message: saved
      ? "Guardamos tu pedido. Enviá el mensaje por WhatsApp para que lo reciba el local."
      : "No pudimos guardarlo en la base. Igual podés enviarlo por WhatsApp.",
    whatsAppUrl,
  };
}
