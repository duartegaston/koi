import "server-only";

import { getServerEnv } from "@/lib/env";
import { deliveriesPausedNotice } from "@/lib/site";

const TEXT_LIMIT = 3500;

export function whatsAppLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error("WHATSAPP_NUMBER debe ser un teléfono internacional, solo dígitos");
  }

  const body = text.length > TEXT_LIMIT ? `${text.slice(0, TEXT_LIMIT - 1)}…` : text;
  const url = new URL(`https://wa.me/${digits}`);
  url.searchParams.set("text", body);
  return url.toString();
}

export function storeContactWhatsAppUrl(): string {
  return whatsAppLink(getServerEnv().WHATSAPP_NUMBER, "Hola, quiero hacer una consulta.");
}

type ContactWhatsAppInput = {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
};

export type OrderWhatsAppInput = {
  publicCode: string;
  customerName: string;
  customerPhone: string;
  lines: Array<{ name: string; quantity: number; lineTotal: string; madeToOrder: number }>;
  fulfillmentMethod: "motorcycle" | "pickup";
  addressLine: string | null;
  geocodedAddress: string | null;
  mapUrl: string | null;
  shippingCost: string;
  total: string;
  paymentMethod: "mercadopago" | "transfer" | "cash";
  transferAlias: string | null;
  pickupAddress: string | null;
  deliveriesPaused: boolean;
};

export function orderWhatsAppText(order: OrderWhatsAppInput): string {
  const lines = [
    `Hola, soy ${order.customerName}. Hice el pedido ${order.publicCode}.`,
    `Teléfono: ${order.customerPhone}`,
    "",
    "Productos:",
    ...order.lines.map((line) => {
      const madeToOrder = line.madeToOrder > 0 ? ` (${line.madeToOrder} a pedido, llega entre 7 y 10 días hábiles)` : "";
      return `- ${line.quantity} x ${line.name}: $${line.lineTotal}${madeToOrder}`;
    }),
    "",
  ];

  if (order.fulfillmentMethod === "motorcycle") {
    lines.push(
      `Dirección que escribió: ${order.addressLine ?? ""}`,
      `La ubicamos en: ${order.geocodedAddress ?? ""}`,
    );
    if (order.mapUrl) lines.push(`Mapa: ${order.mapUrl}`);
    lines.push(`Costo de envío: $${order.shippingCost}`);
    if (order.deliveriesPaused) lines.push("", deliveriesPausedNotice);
  } else {
    lines.push(`Retiro en el local${order.pickupAddress ? `: ${order.pickupAddress}` : "."}`);
  }

  lines.push(`Total: $${order.total}`, "");

  if (order.paymentMethod === "transfer") {
    lines.push(
      `Pago por transferencia al alias ${order.transferAlias ?? ""}.`,
      "En este chat te envío el comprobante.",
    );
  } else if (order.paymentMethod === "cash") {
    lines.push("Pago en efectivo al retirar en el local.");
  } else {
    lines.push("Pago por Mercado Pago.");
  }

  return lines.join("\n");
}

export function contactWhatsAppText(contact: ContactWhatsAppInput): string {
  const lines = [`Hola, soy ${contact.name}.`, `Email: ${contact.email}`];
  if (contact.phone) lines.push(`Teléfono: ${contact.phone}`);
  lines.push("", contact.message);
  return lines.join("\n");
}
