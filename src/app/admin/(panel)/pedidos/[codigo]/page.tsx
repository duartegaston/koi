import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { OrderActions } from "@/components/forms/order-actions";
import { fulfillmentLabel, formatAdminDate, orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/lib/admin-labels";
import { formatArs } from "@/lib/money";
import { getOrderForAdmin } from "@/services/order.service";

type OrderDetailPageProps = {
  params: Promise<{ codigo: string }>;
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { codigo } = await params;
  const detail = await getOrderForAdmin(codigo);
  if (!detail) notFound();

  const { order, payment } = detail;
  const pending = order.status === "pending_payment";
  const waitingMercadoPago = pending && order.paymentMethod === "mercadopago" && payment?.status !== "approved";

  return (
    <AdminPage title={order.publicCode}>
      <p className="text-sm text-muted">
        <Link href="/admin/pedidos" className="underline underline-offset-4">
          Pedidos
        </Link>
        {" · "}
        {formatAdminDate(order.createdAt)}
      </p>

      <dl className="mt-8 grid gap-6 text-sm md:grid-cols-2">
        <div>
          <dt className="font-label text-sm tracking-wide text-muted">Cliente</dt>
          <dd className="mt-2">
            {order.customerName}
            <br />
            {order.customerPhone}
            {order.customerEmail ? (
              <>
                <br />
                {order.customerEmail}
              </>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="font-label text-sm tracking-wide text-muted">Entrega y pago</dt>
          <dd className="mt-2">
            {orderStatusLabel[order.status]} · {fulfillmentLabel[order.fulfillmentMethod]} · {paymentMethodLabel[order.paymentMethod]}
            {payment ? ` · ${paymentStatusLabel[payment.status]}` : null}
            {order.fulfillmentMethod === "motorcycle" && order.addressLine ? (
              <>
                <br />
                {order.addressLine}
                {order.distanceKm ? ` · ${order.distanceKm} km` : ""}
              </>
            ) : null}
          </dd>
        </div>
      </dl>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
            <span>
              {item.productName}
              <span className="text-muted"> × {item.quantity}</span>
            </span>
            <span>{formatArs(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Productos</dt>
          <dd>{formatArs(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Envío</dt>
          <dd>{formatArs(order.shippingCost)}</dd>
        </div>
        <div className="flex justify-between gap-4 font-medium">
          <dt>Total</dt>
          <dd>{formatArs(order.total)}</dd>
        </div>
      </dl>

      {waitingMercadoPago ? <p className="mt-8 text-sm">Esperando que Mercado Pago acredite el pago.</p> : null}

      <OrderActions
        publicCode={order.publicCode}
        canApproveTransfer={pending && order.paymentMethod === "transfer"}
        canConfirmPayment={pending && order.paymentMethod === "mercadopago" && payment?.status === "approved"}
        canCancel={pending}
        canFulfill={order.status === "paid"}
      />
    </AdminPage>
  );
}
