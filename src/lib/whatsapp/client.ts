import "server-only";
import { getServerEnv } from "@/lib/env";

const GRAPH_API_VERSION = "v23.0";

type SendMessageResponse = {
  messaging_product: "whatsapp";
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
};

type GraphError = { error: { message: string; code: number; error_subcode?: number } };

async function postMessage(payload: Record<string, unknown>): Promise<SendMessageResponse> {
  const env = getServerEnv();
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    },
  );

  const body = (await response.json()) as SendMessageResponse | GraphError;
  if (!response.ok || "error" in body) {
    const message = "error" in body ? body.error.message : response.statusText;
    throw new Error(`WhatsApp Cloud API (${response.status}): ${message}`);
  }

  return body;
}

/**
 * Texto libre: Meta solo lo entrega si el destinatario escribió al número
 * del negocio en las últimas 24 h (ventana de atención, sin costo).
 * Fuera de esa ventana hay que usar `sendWhatsAppTemplate`.
 */
export function sendWhatsAppText(to: string, body: string) {
  return postMessage({
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body },
  });
}

/** Plantillas pre-aprobadas en WhatsApp Manager; inician conversaciones. */
export function sendWhatsAppTemplate(
  to: string,
  template: string,
  params: string[] = [],
  languageCode = "es",
) {
  return postMessage({
    to,
    type: "template",
    template: {
      name: template,
      language: { code: languageCode },
      components: params.length
        ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }]
        : undefined,
    },
  });
}
