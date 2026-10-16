import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { OrderFilters } from "@/components/forms/order-filters";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminOrders } from "@/data-access/admin-order.repository";
import { orderStatuses, paymentMethods } from "@/data-access/order.repository";
import { formatAdminDate, orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/lib/admin-labels";
import { normalizeOrderCode, ordersPath } from "@/lib/admin-orders";
import { formatArs } from "@/lib/money";
import { decodeOrderCursor, encodeOrderCursor } from "@/lib/order-cursor";

const pageSize = 20;

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const status = oneOf(first(params.status), orderStatuses);
  const paymentMethod = oneOf(first(params.paymentMethod), paymentMethods);
  const code = normalizeOrderCode(first(params.code));
  const cursor = decodeOrderCursor(first(params.cursor) ?? "");

  const rows = await listAdminOrders({
    status,
    paymentMethod,
    code,
    cursor: cursor ?? undefined,
    limit: pageSize + 1,
  });
  const hasMore = rows.length > pageSize;
  const visible = rows.slice(0, pageSize);
  const last = visible.at(-1);
  const nextHref =
    hasMore && last
      ? ordersPath({
          status,
          paymentMethod,
          code,
          cursor: encodeOrderCursor(last.createdAt, last.id),
        })
      : null;

  return (
    <AdminPage
      title="Pedidos"
      action={
        <Link href="/admin/pedidos/nuevo" className={buttonClass.secondary}>
          Cargar pedido
        </Link>
      }
    >
      <OrderFilters
        status={status}
        paymentMethod={paymentMethod}
        code={code}
        statuses={orderStatuses.map((value) => ({ value, label: orderStatusLabel[value] }))}
        methods={paymentMethods.map((value) => ({ value, label: paymentMethodLabel[value] }))}
      />

      {visible.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No hay pedidos" body="Probá con otro filtro." />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {visible.map((order) => (
            <li key={order.id}>
              <Link href={`/admin/pedidos/${order.publicCode}`} className="grid gap-1 py-4 text-sm md:grid-cols-[8rem_1fr_auto] md:items-baseline">
                <span className="font-medium">{order.publicCode}</span>
                <span>
                  {order.customerName}
                  <span className="mt-1 block text-muted md:mt-0 md:ml-2 md:inline">
                    {orderStatusLabel[order.status]} · {paymentMethodLabel[order.paymentMethod]}
                    {order.paymentStatus ? ` · ${paymentStatusLabel[order.paymentStatus]}` : ""} · {formatAdminDate(order.createdAt)}
                  </span>
                </span>
                <span>{formatArs(order.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {nextHref ? (
        <Link href={nextHref} className={`${buttonClass.secondary} mt-8`}>
          Siguientes
        </Link>
      ) : null}
    </AdminPage>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  const picked = Array.isArray(value) ? value[0] : value;
  return picked && picked.length > 0 ? picked : undefined;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  if (!value) return undefined;
  return allowed.find((item) => item === value);
}

