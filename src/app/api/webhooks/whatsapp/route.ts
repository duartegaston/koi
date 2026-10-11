import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { verifyWebhookSignature, type WhatsAppWebhookPayload } from "@/lib/whatsapp/webhook";

export const runtime = "edge";

/** Handshake de verificación que Meta hace al registrar el webhook. */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === getServerEnv().WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const isValid = await verifyWebhookSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    getServerEnv().WHATSAPP_APP_SECRET,
  );

  if (!isValid) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      for (const message of change.value.messages ?? []) {
        // TODO: persistir / responder. Cada mensaje entrante abre una ventana
        // de 24 h en la que se puede responder con texto libre sin costo.
        console.log("WhatsApp entrante", { from: message.from, type: message.type });
      }
    }
  }

  // Meta reintenta si no recibe 200 rápido: el trabajo pesado debe ser asíncrono.
  return NextResponse.json({ received: true });
}
