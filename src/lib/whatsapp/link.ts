import "server-only";

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
  lines: Array<{ name: string; quantity: number; lineTotal: string }>;
  fulfillmentMethod: "motorcycle" | "pickup";
  addressLine: string | null;
  shippingCost: string;
  total: string;
  paymentMethod: "mercadopago" | "transfer";
  transferAlias: string | null;
  pickupAddress: string | null;
};

export function orderWhatsAppText(order: OrderWhatsAppInput): string {
  const lines = [
    `Hola, soy ${order.customerName}. Hice el pedido ${order.publicCode}.`,
    `Teléfono: ${order.customerPhone}`,
    "",
    "Productos:",
    ...order.lines.map((line) => `- ${line.quantity} x ${line.name}: $${line.lineTotal}`),
    "",
  ];

  if (order.fulfillmentMethod === "motorcycle") {
    lines.push(`Envío a: ${order.addressLine ?? ""}`, `Costo de envío: $${order.shippingCost}`);
  } else {
    lines.push(`Retiro en el local${order.pickupAddress ? `: ${order.pickupAddress}` : "."}`);
  }

  lines.push(`Total: $${order.total}`, "");

  if (order.paymentMethod === "transfer") {
    lines.push(
      `Pago por transferencia al alias ${order.transferAlias ?? ""}.`,
      "En este chat te envío el comprobante.",
    );
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
