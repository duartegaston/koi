import "server-only";

import { findPaymentByOrderId, savePaymentResult, type PaymentStatus } from "@/data-access/payment.repository";
import { findOrderByPublicCode } from "@/data-access/order.repository";
import { createPreference, fetchPayment } from "@/lib/mercadopago/api";
import { safeMercadoPagoUrl } from "@/lib/safe-url";
import { toCents } from "@/lib/money";
import { fail, type ServiceResult } from "./result";

export type CheckoutItem = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: string;
};

export async function openMercadoPagoCheckout(input: {
  orderId: string;
  publicCode: string;
  items: CheckoutItem[];
  payerName: string;
  payerEmail?: string;
}): Promise<ServiceResult<{ checkoutUrl: string; preferenceId: string }>> {
  try {
    const preference = await createPreference(input);
    const checkoutUrl = safeMercadoPagoUrl(preference.checkoutUrl);
    if (!checkoutUrl) {
      return fail("mercadopago_unavailable", "Mercado Pago no devolvió un link de pago válido.");
    }
    return { ok: true, value: { checkoutUrl, preferenceId: preference.id } };
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
    console.error("No se pudo crear la preferencia de Mercado Pago", error instanceof Error ? error.message : "error", cause ?? "");
    return fail("mercadopago_unavailable", "No pudimos abrir Mercado Pago. Probá de nuevo.");
  }
}

export async function applyMercadoPagoNotification(paymentId: string): Promise<ServiceResult<{ status: PaymentStatus }>> {
  if (!/^\d{1,20}$/.test(paymentId)) {
    return fail("payment_ignored", "La notificación no corresponde a un pago.");
  }

  let payment;
  try {
    payment = await fetchPayment(paymentId);
  } catch (error) {
    console.error("No se pudo consultar el pago en Mercado Pago", error instanceof Error ? error.message : "error");
    return fail("mercadopago_unavailable", "No pudimos confirmar el pago.");
  }

  const publicCode = payment.externalReference?.trim() ?? "";
  if (!publicCode) {
    return fail("payment_ignored", "El pago no tiene un pedido asociado.");
  }

  const order = await findOrderByPublicCode(publicCode);
  if (!order || order.paymentMethod !== "mercadopago" || order.status === "cancelled") {
    return fail("payment_ignored", "Ese pago no corresponde a un pedido pendiente.");
  }

  const recorded = await findPaymentByOrderId(order.id);
  if (!recorded || recorded.provider !== "mercadopago") {
    return fail("payment_ignored", "El pedido no tiene un pago de Mercado Pago.");
  }

  const nextStatus = mapPaymentStatus(payment.status);
  if (!nextStatus) {
    return fail("payment_ignored", "Estado de pago no reconocido.");
  }
  if (nextStatus === "pending" && recorded.status !== "pending") {
    return { ok: true, value: { status: recorded.status } };
  }
  if (payment.currency !== "ARS" || toCents(payment.amount) !== toCents(order.total)) {
    console.error("Mercado Pago informó un importe distinto al del pedido", {
      publicCode: order.publicCode,
      paymentId: payment.id,
    });
    return fail("amount_mismatch", "El importe del pago no coincide con el pedido.");
  }

  const saved = await savePaymentResult(recorded.id, { externalId: payment.id, status: nextStatus });
  if (!saved) {
    return fail("payment_ignored", "No se pudo actualizar el pago.");
  }
  return { ok: true, value: { status: saved.status } };
}

function mapPaymentStatus(status: string): PaymentStatus | null {
  if (status === "approved") return "approved";
  if (status === "rejected" || status === "cancelled" || status === "refunded" || status === "charged_back") {
    return "rejected";
  }
  if (status === "pending" || status === "in_process" || status === "in_mediation" || status === "authorized") {
    return "pending";
  }
  return null;
}
