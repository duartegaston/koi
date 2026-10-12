import "server-only";

import { transaction } from "@/data-access/executor";
import { approvePendingOrder, findOrderByPublicCode } from "@/data-access/order.repository";
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
  const code = publicCode.trim();
  const order = await findOrderByPublicCode(code);
  if (!order) {
    return fail("order_not_found", "No encontramos ese pedido.");
  }
  if (order.status !== "pending_payment") {
    return fail("order_not_pending", "Ese pedido ya no está pendiente de aprobación.");
  }
  if (order.items.length === 0) {
    return fail("empty_order", "El pedido no tiene productos.");
  }

  try {
    const approved = await transaction(async (tx) => {
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
      return marked;
    });

    return { ok: true, value: { publicCode: approved.publicCode, status: "paid" } };
  } catch (error) {
    if (error instanceof ApprovalRejected) {
      return fail(error.code, error.message);
    }
    throw error;
  }
}

class ApprovalRejected extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
