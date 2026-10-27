import "server-only";

import { markOrderFulfilled } from "@/data-access/admin-order.repository";
import { transaction, type DbTransaction } from "@/data-access/executor";
import {
  approvePendingOrder,
  cancelOrderFromStatus,
  findOrderByPublicCode,
  insertOrder,
  insertOrderItems,
  type NewOrderItemInput,
  type OrderRecord,
  type PaymentMethod,
} from "@/data-access/order.repository";
import { findPaymentByOrderId, insertPayment, setPaymentStatus } from "@/data-access/payment.repository";
import { decrementStock, incrementStock, lockProductsByIds } from "@/data-access/product.repository";
import { madeToOrderUnits, orderQuantityLimit } from "@/lib/order-limits";
import { fromCents, multiplyAmount, toCents } from "@/lib/money";
import { fail, type ServiceFailure, type ServiceResult } from "./result";

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

export async function approveCashOrder(publicCode: string): Promise<ServiceResult<ApprovedOrder>> {
  const order = await loadPendingOrder(publicCode);
  if (!order.ok) return order;
  if (order.value.paymentMethod !== "cash") {
    return fail("not_cash", "Ese pedido no es en efectivo.");
  }
  if (order.value.fulfillmentMethod !== "pickup") {
    return fail("cash_requires_pickup", "El efectivo es solo para retiro en el local.");
  }

  const payment = await findPaymentByOrderId(order.value.id);
  if (!payment || payment.provider !== "cash") {
    return fail("payment_missing", "El pedido no tiene un pago en efectivo.");
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

/**
 * Cancela un pedido pendiente, pagado o entregado.
 * Si el stock ya se había descontado (`paid` / `fulfilled`), lo restaura.
 */
export async function cancelOrder(
  publicCode: string,
): Promise<ServiceResult<{ publicCode: string; restoredStock: boolean }>> {
  const order = await findOrderByPublicCode(publicCode.trim());
  if (!order) return fail("order_not_found", "No encontramos ese pedido.");
  if (order.status === "cancelled") {
    return fail("already_cancelled", "Ese pedido ya está cancelado.");
  }
  if (order.items.length === 0) return fail("empty_order", "El pedido no tiene productos.");

  const hadStockDeducted = order.status === "paid" || order.status === "fulfilled";

  try {
    const cancelled = await transaction(async (tx) => {
      const marked = await cancelOrderFromStatus(order.id, order.status, tx);
      if (!marked) {
        throw new ApprovalRejected("order_not_cancellable", "Ese pedido ya no se puede cancelar.");
      }

      if (hadStockDeducted) {
        for (const item of order.items) {
          const restoreQty = item.quantity - item.madeToOrderQuantity;
          if (restoreQty <= 0) continue;
          const updated = await incrementStock(item.productId, restoreQty, tx);
          if (!updated) {
            throw new ApprovalRejected(
              "product_missing",
              `No encontramos ${item.productName} para restaurar el stock.`,
            );
          }
        }

        const payment = await findPaymentByOrderId(order.id, tx);
        if (payment?.status === "approved") {
          const rejected = await setPaymentStatus(payment.id, "rejected", tx);
          if (!rejected) {
            throw new ApprovalRejected("payment_missing", "No se pudo marcar el pago como rechazado.");
          }
        }
      }

      return marked;
    });

    return { ok: true, value: { publicCode: cancelled.publicCode, restoredStock: hadStockDeducted } };
  } catch (error) {
    return rejectionOrThrow(error);
  }
}

export async function fulfillOrder(publicCode: string): Promise<ServiceResult<{ publicCode: string }>> {
  const order = await findOrderByPublicCode(publicCode.trim());
  if (!order) return fail("order_not_found", "No encontramos ese pedido.");
  if (order.status !== "paid") return fail("order_not_paid", "Solo se puede marcar como entregado un pedido pagado.");

  const fulfilled = await markOrderFulfilled(order.id);
  if (!fulfilled) return fail("order_not_paid", "Ese pedido ya no está pagado.");
  return { ok: true, value: { publicCode: fulfilled.publicCode } };
}

export type ManualPickupOrderInput = {
  customerName: string;
  customerPhone: string;
  paymentMethod: Extract<PaymentMethod, "transfer" | "cash">;
  delivered: boolean;
  lines: Array<{ productId: string; quantity: number }>;
};

/**
 * Registra un pedido de retiro ya cobrado y descuenta el stock.
 * El precio sale del catálogo. Si piden más de lo que hay, el resto queda a pedido.
 */
export async function recordManualPickupOrder(
  input: ManualPickupOrderInput,
): Promise<ServiceResult<{ publicCode: string }>> {
  try {
    const publicCode = await transaction(async (tx) => {
      const productIds = input.lines.map((line) => line.productId);
      if (new Set(productIds).size !== productIds.length) {
        throw new ApprovalRejected("duplicate_product", "Cada producto puede aparecer una sola vez.");
      }
      const products = await lockProductsByIds(productIds, tx);
      const byId = new Map(products.map((product) => [product.id, product]));
      const items: NewOrderItemInput[] = [];
      let subtotalCents = 0;

      for (const line of input.lines) {
        const product = byId.get(line.productId);
        if (!product || product.deletedAt) {
          throw new ApprovalRejected("product_missing", "Uno de los productos ya no está en el catálogo.");
        }
        const limit = orderQuantityLimit(product.maxPerOrder);
        if (line.quantity > limit) {
          throw new ApprovalRejected("quantity_limit", `${product.name} admite hasta ${limit} por pedido.`);
        }
        const lineTotal = multiplyAmount(product.price, line.quantity);
        subtotalCents += toCents(lineTotal);
        items.push({
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: line.quantity,
          madeToOrderQuantity: madeToOrderUnits(line.quantity, product.stock),
          lineTotal,
        });
      }

      const subtotal = fromCents(subtotalCents);
      for (const item of items) {
        const updated = await decrementStock(item.productId, item.quantity, tx);
        if (!updated) {
          throw new ApprovalRejected("product_missing", `No encontramos ${item.productName} para descontar el stock.`);
        }
      }

      const order = await insertOrder(
        {
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          fulfillmentMethod: "pickup",
          subtotal,
          shippingCost: "0.00",
          total: subtotal,
          paymentMethod: input.paymentMethod,
        },
        tx,
      );
      await insertOrderItems(order.id, items, tx);
      const paid = await approvePendingOrder(order.id, tx);
      if (!paid) {
        throw new ApprovalRejected("order_not_pending", "No se pudo marcar el pedido como pagado.");
      }
      if (input.delivered) {
        const fulfilled = await markOrderFulfilled(order.id, tx);
        if (!fulfilled) {
          throw new ApprovalRejected("order_not_paid", "No se pudo marcar el pedido como entregado.");
        }
      }
      await insertPayment(
        { orderId: order.id, provider: input.paymentMethod, amount: subtotal, status: "approved" },
        tx,
      );
      return paid.publicCode;
    });
    return { ok: true, value: { publicCode } };
  } catch (error) {
    return rejectionOrThrow(error);
  }
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
      throw new ApprovalRejected("product_missing", `No encontramos ${item.productName} para descontar el stock.`);
    }
  }

  const marked = await approvePendingOrder(order.id, tx);
  if (!marked) {
    throw new ApprovalRejected("order_not_pending", "Ese pedido ya no está pendiente de aprobación.");
  }
  return { publicCode: marked.publicCode, status: "paid" };
}

function rejectionOrThrow(error: unknown): ServiceFailure {
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
