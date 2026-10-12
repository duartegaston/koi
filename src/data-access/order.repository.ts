import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { executor, firstRow, type DbExecutor } from "./executor";

const { orderItems, orders } = schema;

export const orderStatuses = ["pending_payment", "paid", "cancelled", "fulfilled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const fulfillmentMethods = ["motorcycle", "pickup"] as const;
export type FulfillmentMethod = (typeof fulfillmentMethods)[number];

export const paymentMethods = ["mercadopago", "transfer", "cash"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export type NewOrderInput = {
  cartId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  fulfillmentMethod: FulfillmentMethod;
  addressLine?: string;
  geocodedAddress?: string;
  city?: string;
  province?: string;
  latitude?: string;
  longitude?: string;
  distanceKm?: string;
  shippingZoneId?: string;
  subtotal: string;
  shippingCost: string;
  total: string;
  paymentMethod: PaymentMethod;
};

export type NewOrderItemInput = {
  productId: string;
  productName: string;
  unitPrice: string;
  quantity: number;
  madeToOrderQuantity: number;
  lineTotal: string;
};

export type OrderItemRecord = NewOrderItemInput & { id: string };

export type OrderRecord = {
  id: string;
  publicCode: string;
  cartId: string | null;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  fulfillmentMethod: FulfillmentMethod;
  addressLine: string | null;
  geocodedAddress: string | null;
  city: string | null;
  province: string | null;
  latitude: string | null;
  longitude: string | null;
  distanceKm: string | null;
  shippingZoneId: string | null;
  subtotal: string;
  shippingCost: string;
  total: string;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  items: OrderItemRecord[];
};

const orderColumns = {
  id: orders.id,
  publicCode: orders.publicCode,
  cartId: orders.cartId,
  status: orders.status,
  customerName: orders.customerName,
  customerPhone: orders.customerPhone,
  customerEmail: orders.customerEmail,
  fulfillmentMethod: orders.fulfillmentMethod,
  addressLine: orders.addressLine,
  geocodedAddress: orders.geocodedAddress,
  city: orders.city,
  province: orders.province,
  latitude: orders.latitude,
  longitude: orders.longitude,
  distanceKm: orders.distanceKm,
  shippingZoneId: orders.shippingZoneId,
  subtotal: orders.subtotal,
  shippingCost: orders.shippingCost,
  total: orders.total,
  paymentMethod: orders.paymentMethod,
  createdAt: orders.createdAt,
};

export async function insertOrder(input: NewOrderInput, db?: DbExecutor) {
  const row = firstRow(
    await executor(db)
      .insert(orders)
      .values({
        cartId: input.cartId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        fulfillmentMethod: input.fulfillmentMethod,
        addressLine: input.addressLine,
        geocodedAddress: input.geocodedAddress,
        city: input.city,
        province: input.province,
        latitude: input.latitude,
        longitude: input.longitude,
        distanceKm: input.distanceKm,
        shippingZoneId: input.shippingZoneId,
        subtotal: input.subtotal,
        shippingCost: input.shippingCost,
        total: input.total,
        paymentMethod: input.paymentMethod,
      })
      .returning({ id: orders.id, publicCode: orders.publicCode, status: orders.status, total: orders.total }),
    "No se pudo crear el pedido",
  );

  return { ...row, status: asOrderStatus(row.status) };
}

export async function insertOrderItems(orderId: string, items: NewOrderItemInput[], db?: DbExecutor) {
  if (items.length === 0) {
    return [];
  }

  return executor(db)
    .insert(orderItems)
    .values(items.map((item) => ({ orderId, ...item })))
    .returning({ id: orderItems.id, productId: orderItems.productId, quantity: orderItems.quantity });
}

export async function findOrderByPublicCode(publicCode: string, db?: DbExecutor): Promise<OrderRecord | null> {
  const [row] = await executor(db).select(orderColumns).from(orders).where(eq(orders.publicCode, publicCode)).limit(1);
  if (!row) {
    return null;
  }
  return withItems(row, db);
}

export async function findOrderById(id: string, db?: DbExecutor): Promise<OrderRecord | null> {
  const [row] = await executor(db).select(orderColumns).from(orders).where(eq(orders.id, id)).limit(1);
  if (!row) {
    return null;
  }
  return withItems(row, db);
}

/** Pasa a `paid` solo si sigue pendiente. `null` si otro proceso ya lo aprobó. */
export async function approvePendingOrder(orderId: string, db?: DbExecutor) {
  const [row] = await executor(db)
    .update(orders)
    .set({ status: "paid", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending_payment")))
    .returning({ id: orders.id, publicCode: orders.publicCode, status: orders.status });

  return row ? { ...row, status: asOrderStatus(row.status) } : null;
}

/** Suelta el carrito para poder reintentar si Mercado Pago no abrió el cobro. */
export async function cancelPendingOrder(orderId: string, db?: DbExecutor) {
  const [row] = await executor(db)
    .update(orders)
    .set({ status: "cancelled", cartId: null, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending_payment")))
    .returning({ id: orders.id, publicCode: orders.publicCode, status: orders.status });

  return row ? { ...row, status: asOrderStatus(row.status) } : null;
}

export async function setOrderStatus(orderId: string, status: OrderStatus, db?: DbExecutor) {
  const [row] = await executor(db)
    .update(orders)
    .set({ status })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id, publicCode: orders.publicCode, status: orders.status });

  return row ? { ...row, status: asOrderStatus(row.status) } : null;
}

async function withItems(
  row: {
    id: string;
    publicCode: string;
    cartId: string | null;
    status: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    fulfillmentMethod: string;
    addressLine: string | null;
    geocodedAddress: string | null;
    city: string | null;
    province: string | null;
    latitude: string | null;
    longitude: string | null;
    distanceKm: string | null;
    shippingZoneId: string | null;
    subtotal: string;
    shippingCost: string;
    total: string;
    paymentMethod: string;
    createdAt: Date;
  },
  db?: DbExecutor,
): Promise<OrderRecord> {
  const items = await executor(db)
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: orderItems.productName,
      unitPrice: orderItems.unitPrice,
      quantity: orderItems.quantity,
      madeToOrderQuantity: orderItems.madeToOrderQuantity,
      lineTotal: orderItems.lineTotal,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, row.id))
    .orderBy(asc(orderItems.productName));

  return {
    ...row,
    status: asOrderStatus(row.status),
    fulfillmentMethod: asFulfillmentMethod(row.fulfillmentMethod),
    paymentMethod: asPaymentMethod(row.paymentMethod),
    items,
  };
}

function asOrderStatus(value: string): OrderStatus {
  if (value === "pending_payment" || value === "paid" || value === "cancelled" || value === "fulfilled") {
    return value;
  }
  throw new Error(`Estado de pedido desconocido: ${value}`);
}

function asFulfillmentMethod(value: string): FulfillmentMethod {
  if (value === "motorcycle" || value === "pickup") {
    return value;
  }
  throw new Error(`Método de entrega desconocido: ${value}`);
}

function asPaymentMethod(value: string): PaymentMethod {
  if (value === "mercadopago" || value === "transfer" || value === "cash") {
    return value;
  }
  throw new Error(`Método de pago desconocido: ${value}`);
}
