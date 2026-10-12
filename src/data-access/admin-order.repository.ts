import "server-only";

import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { schema } from "@/db";
import type { FulfillmentMethod, OrderStatus, PaymentMethod } from "./order.repository";
import { executor, type DbExecutor } from "./executor";
import type { PaymentStatus } from "./payment.repository";

const { orders, payments } = schema;

export type AdminOrderListItem = {
  id: string;
  publicCode: string;
  status: OrderStatus;
  customerName: string;
  total: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus | null;
  fulfillmentMethod: FulfillmentMethod;
  createdAt: Date;
};

export type OrderListQuery = {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  code?: string;
  cursor?: { createdAt: Date; id: string };
  limit: number;
};

export async function listAdminOrders(query: OrderListQuery, db?: DbExecutor): Promise<AdminOrderListItem[]> {
  const cursor = query.cursor
    ? or(
        lt(orders.createdAt, query.cursor.createdAt),
        and(eq(orders.createdAt, query.cursor.createdAt), lt(orders.id, query.cursor.id)),
      )
    : undefined;

  const rows = await executor(db)
    .select({
      id: orders.id,
      publicCode: orders.publicCode,
      status: orders.status,
      customerName: orders.customerName,
      total: orders.total,
      paymentMethod: orders.paymentMethod,
      fulfillmentMethod: orders.fulfillmentMethod,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        query.status ? eq(orders.status, query.status) : undefined,
        query.paymentMethod ? eq(orders.paymentMethod, query.paymentMethod) : undefined,
        query.code ? eq(orders.publicCode, query.code) : undefined,
        cursor,
      ),
    )
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(query.limit);

  const paymentRows =
    rows.length === 0
      ? []
      : await executor(db)
          .select({ orderId: payments.orderId, status: payments.status })
          .from(payments)
          .where(
            inArray(
              payments.orderId,
              rows.map((row) => row.id),
            ),
          );
  const paymentByOrder = new Map(paymentRows.map((payment) => [payment.orderId, payment.status]));

  return rows.map((row) => {
    const paymentStatus = paymentByOrder.get(row.id);
    return {
      ...row,
      status: asOrderStatus(row.status),
      paymentMethod: asPaymentMethod(row.paymentMethod),
      paymentStatus: paymentStatus ? asPaymentStatus(paymentStatus) : null,
      fulfillmentMethod: asFulfillmentMethod(row.fulfillmentMethod),
    };
  });
}

export async function markOrderFulfilled(orderId: string, db?: DbExecutor) {
  const [row] = await executor(db)
    .update(orders)
    .set({ status: "fulfilled", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "paid")))
    .returning({ id: orders.id, publicCode: orders.publicCode });
  return row ?? null;
}

export async function getDashboardNumbers(db?: DbExecutor) {
  const dayStart = sql`(date_trunc('day', now() AT TIME ZONE 'America/Argentina/Buenos_Aires') AT TIME ZONE 'America/Argentina/Buenos_Aires')`;
  const [row] = await executor(db)
    .select({
      pendingTransfers: sql<string>`count(*) filter (where ${orders.status} = 'pending_payment' and ${orders.paymentMethod} = 'transfer')`,
      collectedToday: sql<string>`coalesce(sum(${orders.total}) filter (where ${orders.status} in ('paid', 'fulfilled') and ${orders.createdAt} >= ${dayStart}), 0)`,
      ordersToday: sql<string>`count(*) filter (where ${orders.createdAt} >= ${dayStart})`,
    })
    .from(orders);
  return (
    row ?? {
      pendingTransfers: "0",
      collectedToday: "0.00",
      ordersToday: "0",
    }
  );
}

export async function listRecentOrders(limit: number, db?: DbExecutor) {
  const rows = await executor(db)
    .select({
      publicCode: orders.publicCode,
      customerName: orders.customerName,
      total: orders.total,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    status: asOrderStatus(row.status),
    paymentMethod: asPaymentMethod(row.paymentMethod),
  }));
}

function asOrderStatus(value: string): OrderStatus {
  if (value === "pending_payment" || value === "paid" || value === "cancelled" || value === "fulfilled") return value;
  throw new Error(`Estado de pedido desconocido: ${value}`);
}

function asPaymentMethod(value: string): PaymentMethod {
  if (value === "mercadopago" || value === "transfer") return value;
  throw new Error(`Método de pago desconocido: ${value}`);
}

function asPaymentStatus(value: string): PaymentStatus {
  if (value === "pending" || value === "approved" || value === "rejected") return value;
  throw new Error(`Estado de pago desconocido: ${value}`);
}

function asFulfillmentMethod(value: string): FulfillmentMethod {
  if (value === "motorcycle" || value === "pickup") return value;
  throw new Error(`Método de entrega desconocido: ${value}`);
}
