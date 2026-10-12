import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatAdminDate, orderStatusLabel, paymentMethodLabel } from "@/lib/admin-labels";
import { formatArs } from "@/lib/money";
import { lowStockThreshold } from "@/lib/stock";
import { getAdminDashboard } from "@/services/admin-dashboard.service";

export default async function AdminHomePage() {
  const dashboard = await getAdminDashboard();

  return (
    <AdminPage title="Resumen">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="border border-line bg-surface px-5 py-6">
          <dt className="font-label text-sm tracking-wide text-muted">Transferencias por aprobar</dt>
          <dd className="mt-3 font-display text-4xl">{dashboard.pendingTransfers}</dd>
        </div>
        <div className="border border-line bg-surface px-5 py-6">
          <dt className="font-label text-sm tracking-wide text-muted">Cobrado hoy</dt>
          <dd className="mt-3 font-display text-4xl">{formatArs(dashboard.collectedToday)}</dd>
        </div>
        <div className="border border-line bg-surface px-5 py-6">
          <dt className="font-label text-sm tracking-wide text-muted">Pedidos de hoy</dt>
          <dd className="mt-3 font-display text-4xl">{dashboard.ordersToday}</dd>
        </div>
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl">Stock bajo</h2>
            <Link href="/admin/stock" className="text-sm underline underline-offset-4">
              Ver stock
            </Link>
          </div>
          {dashboard.lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Ningún producto activo tiene {lowStockThreshold} unidades o menos.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {dashboard.lowStock.map((product) => (
                <li key={product.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                  <Link href={`/admin/productos/${product.id}`} className="underline underline-offset-4">
                    {product.name}
                  </Link>
                  <span>{product.stock === 0 ? "Sin stock" : product.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl">Últimos pedidos</h2>
            <Link href="/admin/pedidos" className="text-sm underline underline-offset-4">
              Ver pedidos
            </Link>
          </div>
          {dashboard.recent.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Todavía no hay pedidos" body="Cuando entre el primero, va a aparecer acá." />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {dashboard.recent.map((order) => (
                <li key={order.publicCode} className="py-3 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <Link href={`/admin/pedidos/${order.publicCode}`} className="underline underline-offset-4">
                      {order.publicCode}
                    </Link>
                    <span>{formatArs(order.total)}</span>
                  </div>
                  <p className="mt-1 text-muted">
                    {order.customerName} · {orderStatusLabel[order.status]} · {paymentMethodLabel[order.paymentMethod]}
                  </p>
                  <p className="text-muted">{formatAdminDate(order.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {dashboard.pendingTransfers > 0 ? (
        <Link
          href="/admin/pedidos?status=pending_payment&paymentMethod=transfer"
          className={`${buttonClass.primary} mt-10`}
        >
          Revisar transferencias
        </Link>
      ) : null}
    </AdminPage>
  );
}
