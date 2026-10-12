import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminOrders } from "@/data-access/admin-order.repository";
import { orderStatuses, paymentMethods, type OrderStatus, type PaymentMethod } from "@/data-access/order.repository";
import { formatAdminDate, orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/lib/admin-labels";
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
  const codeValue = first(params.code)?.trim().toUpperCase();
  const code = codeValue && /^KOI-[A-F0-9]{8}$/.test(codeValue) ? codeValue : undefined;
  const codeError = codeValue && !code ? "El código no es válido." : undefined;
  const cursor = decodeOrderCursor(first(params.cursor) ?? "");

  const rows = codeError
    ? []
    : await listAdminOrders({
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
      ? ordersHref({
          status,
          paymentMethod,
          code,
          cursor: encodeOrderCursor(last.createdAt, last.id),
        })
      : null;

  return (
    <AdminPage title="Pedidos">
      <form method="get" className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end" key={ordersHref({ status, paymentMethod, code })}>
        <label className="space-y-1.5 text-sm">
          <span className="block font-medium">Estado</span>
          <select name="status" defaultValue={status ?? ""} className="h-11 w-full border border-line bg-background px-3">
            <option value="">Todos</option>
            {orderStatuses.map((value) => (
              <option key={value} value={value}>
                {orderStatusLabel[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="block font-medium">Pago</span>
          <select name="paymentMethod" defaultValue={paymentMethod ?? ""} className="h-11 w-full border border-line bg-background px-3">
            <option value="">Todos</option>
            {paymentMethods.map((value) => (
              <option key={value} value={value}>
                {paymentMethodLabel[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="block font-medium">Código</span>
          <input name="code" defaultValue={codeValue ?? ""} className="h-11 w-full border border-line bg-background px-3" />
          {codeError ? <span className="block text-sm">{codeError}</span> : null}
        </label>
        <button type="submit" className={buttonClass.secondary}>
          Filtrar
        </button>
      </form>

      {visible.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No hay pedidos" body={codeError ? "Revisá el código." : "Probá con otro filtro."} />
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

function ordersHref(input: { status?: OrderStatus; paymentMethod?: PaymentMethod; code?: string; cursor?: string }) {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.paymentMethod) params.set("paymentMethod", input.paymentMethod);
  if (input.code) params.set("code", input.code);
  if (input.cursor) params.set("cursor", input.cursor);
  const query = params.toString();
  return query ? `/admin/pedidos?${query}` : "/admin/pedidos";
}
