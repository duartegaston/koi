import "server-only";

import { markOrderFulfilled } from "@/data-access/admin-order.repository";
import { transaction, type DbTransaction } from "@/data-access/executor";
import { approvePendingOrder, cancelPendingOrder, findOrderByPublicCode, type OrderRecord } from "@/data-access/order.repository";
import { findPaymentByOrderId, setPaymentStatus } from "@/data-access/payment.repository";
import { decrementStock } from "@/data-access/product.repository";
import { fail, type ServiceResult } from "./result";

export type ApprovedOrder = {
  publicCode: string;
  status: "paid";
};

/**
 * Aprueba un pedido pendiente y descuenta el stock.
 * El envío se coordina aparte. No exponer esta función sin un admin autenticado.
 */
export async function approveOrder(publicCode: string): Promise<ServiceResult<ApprovedOrder>> {
  const order = await loadPendingOrder(publicCode);
  if (!order.ok) return order;

  try {
    const approved = await transaction((tx) => settlePendingOrder(order.value, tx));
    return { ok: true, value: approved };
  } catch (error) {
    return rejectionOrThrow(error);
  }
}

export async function approveTransferOrder(publicCode: string): Promise<ServiceResult<ApprovedOrder>> {
  const order = await loadPendingOrder(publicCode);
  if (!order.ok) return order;
  if (order.value.paymentMethod !== "transfer") {
    return fail("not_transfer", "Ese pedido no es por transferencia.");
  }

  const payment = await findPaymentByOrderId(order.value.id);
  if (!payment || payment.provider !== "transfer") {
    return fail("payment_missing", "El pedido no tiene un pago por transferencia.");
  }

  try {
    const approved = await transaction(async (tx) => {
      const settled = await settlePendingOrder(order.value, tx);
      const paid = await setPaymentStatus(payment.id, "approved", tx);
      if (!paid) {
        throw new ApprovalRejected("payment_missing", "No se pudo acreditar el pago.");
      }
      return settled;
    });
    return { ok: true, value: approved };
  } catch (error) {
    return rejectionOrThrow(error);
  }
}

export async function confirmMercadoPagoOrder(publicCode: string): Promise<ServiceResult<ApprovedOrder>> {
  const order = await loadPendingOrder(publicCode);
  if (!order.ok) return order;
  if (order.value.paymentMethod !== "mercadopago") {
    return fail("not_mercadopago", "Ese pedido no es de Mercado Pago.");
  }

  const payment = await findPaymentByOrderId(order.value.id);
  if (!payment || payment.provider !== "mercadopago" || payment.status !== "approved") {
    return fail("payment_not_approved", "Mercado Pago todavía no acreditó el pago.");
  }

  try {
    const approved = await transaction((tx) => settlePendingOrder(order.value, tx));
    return { ok: true, value: approved };
  } catch (error) {
    return rejectionOrThrow(error);
  }
}

export async function cancelOrder(publicCode: string): Promise<ServiceResult<{ publicCode: string }>> {
  const order = await loadPendingOrder(publicCode);
  if (!order.ok) return order;

  const cancelled = await cancelPendingOrder(order.value.id);
  if (!cancelled) {
    return fail("order_not_pending", "Ese pedido ya no está pendiente de aprobación.");
  }
  return { ok: true, value: { publicCode: cancelled.publicCode } };
}

export async function fulfillOrder(publicCode: string): Promise<ServiceResult<{ publicCode: string }>> {
  const order = await findOrderByPublicCode(publicCode.trim());
  if (!order) return fail("order_not_found", "No encontramos ese pedido.");
  if (order.status !== "paid") return fail("order_not_paid", "Solo se puede marcar como entregado un pedido pagado.");

  const fulfilled = await markOrderFulfilled(order.id);
  if (!fulfilled) return fail("order_not_paid", "Ese pedido ya no está pagado.");
  return { ok: true, value: { publicCode: fulfilled.publicCode } };
}

export async function getOrderForAdmin(publicCode: string) {
  const order = await findOrderByPublicCode(publicCode.trim());
  if (!order) return null;
  const payment = await findPaymentByOrderId(order.id);
  return { order, payment };
}

async function loadPendingOrder(publicCode: string): Promise<ServiceResult<OrderRecord>> {
  const order = await findOrderByPublicCode(publicCode.trim());
  if (!order) return fail("order_not_found", "No encontramos ese pedido.");
  if (order.status !== "pending_payment") {
    return fail("order_not_pending", "Ese pedido ya no está pendiente de aprobación.");
  }
  if (order.items.length === 0) return fail("empty_order", "El pedido no tiene productos.");
  return { ok: true, value: order };
}

async function settlePendingOrder(order: OrderRecord, tx: DbTransaction): Promise<ApprovedOrder> {
  for (const item of order.items) {
    const updated = await decrementStock(item.productId, item.quantity, tx);
    if (!updated) {
      throw new ApprovalRejected("insufficient_stock", `No hay stock suficiente de ${item.productName}.`);
    }
  }

  const marked = await approvePendingOrder(order.id, tx);
  if (!marked) {
    throw new ApprovalRejected("order_not_pending", "Ese pedido ya no está pendiente de aprobación.");
  }
  return { publicCode: marked.publicCode, status: "paid" };
}

function rejectionOrThrow(error: unknown): ServiceResult<ApprovedOrder> {
  if (error instanceof ApprovalRejected) return fail(error.code, error.message);
  throw error;
}

class ApprovalRejected extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
