import "server-only";

import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { fromCents, toCents } from "@/lib/money";

const API_URL = "https://api.mercadopago.com";

const preferenceSchema = z.object({
  id: z.string().min(1).max(120),
  init_point: z.url(),
  sandbox_init_point: z.url().nullish(),
});

const paymentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.string(),
  transaction_amount: z.number(),
  currency_id: z.string(),
  external_reference: z.string().nullable().optional(),
});

export type MercadoPagoPreference = {
  id: string;
  checkoutUrl: string;
};

export type MercadoPagoPayment = {
  id: string;
  status: string;
  amount: string;
  currency: string;
  externalReference: string | null;
};

type PreferenceItem = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: string;
};

export async function createPreference(input: {
  orderId: string;
  publicCode: string;
  items: PreferenceItem[];
  payerName: string;
  payerEmail?: string;
}): Promise<MercadoPagoPreference> {
  const appUrl = getServerEnv().APP_URL.replace(/\/$/, "");
  const successUrl = `${appUrl}/checkout/pago?resultado=ok&pedido=${encodeURIComponent(input.publicCode)}`;
  const httpsReturn = successUrl.startsWith("https://");
  const body = {
    items: input.items.map((item) => ({
      id: item.id,
      title: item.title.slice(0, 256),
      quantity: item.quantity,
      currency_id: "ARS",
      unit_price: toCents(item.unitPrice) / 100,
    })),
    payer: {
      name: input.payerName,
      ...(input.payerEmail ? { email: input.payerEmail } : {}),
    },
    external_reference: input.publicCode,
    statement_descriptor: "KOI",
    back_urls: {
      success: successUrl,
      failure: `${appUrl}/checkout/pago?resultado=error&pedido=${encodeURIComponent(input.publicCode)}`,
      pending: `${appUrl}/checkout/pago?resultado=pendiente&pedido=${encodeURIComponent(input.publicCode)}`,
    },
    ...(httpsReturn
      ? {
          auto_return: "approved",
          notification_url: `${appUrl}/api/pagos/mercadopago`,
        }
      : {}),
  };

  const response = await mercadopagoFetch("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "X-Idempotency-Key": input.orderId },
  });
  const preference = preferenceSchema.parse(await response.json());
  const checkoutUrl = accessToken().startsWith("TEST-")
    ? (preference.sandbox_init_point ?? preference.init_point)
    : preference.init_point;

  return { id: preference.id, checkoutUrl };
}

export async function fetchPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const response = await mercadopagoFetch(`/v1/payments/${paymentId}`, { method: "GET" });
  const payment = paymentSchema.parse(await response.json());
  const cents = Math.round(payment.transaction_amount * 100);
  return {
    id: String(payment.id),
    status: payment.status,
    amount: fromCents(cents),
    currency: payment.currency_id,
    externalReference: payment.external_reference ?? null,
  };
}

function accessToken(): string {
  const token = getServerEnv().MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");
  }
  return token;
}

async function mercadopagoFetch(path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Mercado Pago respondió ${response.status}`);
  }
  return response;
}
