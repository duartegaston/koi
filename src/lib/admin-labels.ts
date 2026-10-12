import type { FulfillmentMethod, OrderStatus, PaymentMethod } from "@/data-access/order.repository";
import type { PaymentStatus } from "@/data-access/payment.repository";

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending_payment: "Pendiente",
  paid: "Pagado",
  cancelled: "Cancelado",
  fulfilled: "Entregado",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  transfer: "Transferencia",
  mercadopago: "Mercado Pago",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: "Pago pendiente",
  approved: "Pago acreditado",
  rejected: "Pago rechazado",
};

export const fulfillmentLabel: Record<FulfillmentMethod, string> = {
  motorcycle: "Envío",
  pickup: "Retiro",
};

export function formatAdminDate(value: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(value);
}
