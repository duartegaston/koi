import { applyMercadoPagoNotification } from "@/services/mercadopago.service";
import { getServerEnv } from "@/lib/env";
import { verifyMercadoPagoSignature } from "@/lib/mercadopago/signature";

export async function POST(request: Request) {
  const secret = getServerEnv().MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    return new Response(null, { status: 401 });
  }

  const url = new URL(request.url);
  const queryId = url.searchParams.get("data.id") ?? "";
  const valid = await verifyMercadoPagoSignature({
    secret,
    signatureHeader: request.headers.get("x-signature") ?? "",
    requestId: request.headers.get("x-request-id") ?? "",
    dataId: queryId,
  });
  if (!valid) {
    return new Response(null, { status: 401 });
  }

  const notification = await readNotification(request, url.searchParams.get("type") ?? "", queryId);
  if (notification.type !== "payment" || !/^\d{1,20}$/.test(notification.id)) {
    return new Response(null, { status: 200 });
  }

  const applied = await applyMercadoPagoNotification(notification.id);
  if (!applied.ok && applied.code === "mercadopago_unavailable") {
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 200 });
}

async function readNotification(request: Request, type: string, id: string): Promise<{ type: string; id: string }> {
  if (type === "payment" && id) return { type, id };

  const text = await request.text();
  if (!text || text.length > 10_000) return { type, id };

  try {
    const body = JSON.parse(text) as { type?: unknown; data?: { id?: unknown } };
    const bodyType = typeof body.type === "string" ? body.type : type;
    const bodyId = body.data?.id;
    const resourceId = typeof bodyId === "string" || typeof bodyId === "number" ? String(bodyId) : id;
    return { type: bodyType, id: resourceId };
  } catch {
    return { type, id };
  }
}
