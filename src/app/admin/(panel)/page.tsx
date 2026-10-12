import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatAdminDate, orderStatusLabel, paymentMethodLabel } from "@/lib/admin-labels";
import { resolveAdminPeriod } from "@/lib/admin-period";
import { formatArs } from "@/lib/money";
import { cn } from "@/lib/utils";
import { lowStockThreshold } from "@/lib/stock";
import { getAdminDashboard } from "@/services/admin-dashboard.service";

type AdminHomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const presets = [
  { key: "today", href: "/admin", label: "Hoy" },
  { key: "week", href: "/admin?range=week", label: "7 días" },
  { key: "month", href: "/admin?range=month", label: "30 días" },
] as const;

export default async function AdminHomePage({ searchParams }: AdminHomeProps) {
  const params = await searchParams;
  const { period, error } = resolveAdminPeriod({
    range: first(params.range),
    from: first(params.from),
    to: first(params.to),
  });
  const dashboard = await getAdminDashboard(period);

  return (
    <AdminPage title="Resumen">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const active = period.key === preset.key;
            return (
              <Link
                key={preset.key}
                href={preset.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 font-label text-sm",
                  active ? "border-foreground bg-foreground text-background" : "border-line bg-background",
                )}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="space-y-1.5 text-sm">
            <span className="block font-medium">Desde</span>
            <input
              type="date"
              name="from"
              required
              defaultValue={period.key === "custom" ? period.fromDate : ""}
              className="h-11 w-full border border-line bg-background px-3"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="block font-medium">Hasta</span>
            <input
              type="date"
              name="to"
              required
              defaultValue={period.key === "custom" ? period.toDate : ""}
              className="h-11 w-full border border-line bg-background px-3"
            />
          </label>
          <button type="submit" className={buttonClass.secondary}>
            Ver fechas
          </button>
        </form>
        {error ? (
          <p role="alert" className="text-sm">
            {error}
          </p>
        ) : null}
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="border border-line bg-surface px-5 py-6">
          <dt className="font-label text-sm tracking-wide text-muted">Transferencias por aprobar</dt>
          <dd className="mt-3 font-display text-4xl">{dashboard.pendingTransfers}</dd>
        </div>
        <div className="border border-line bg-surface px-5 py-6">
          <dt className="font-label text-sm tracking-wide text-muted">{period.collectedLabel}</dt>
          <dd className="mt-3 font-display text-4xl">{formatArs(dashboard.collected)}</dd>
        </div>
        <div className="border border-line bg-surface px-5 py-6">
          <dt className="font-label text-sm tracking-wide text-muted">{period.ordersLabel}</dt>
          <dd className="mt-3 font-display text-4xl">{dashboard.orderCount}</dd>
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

function first(value: string | string[] | undefined): string | undefined {
  const picked = Array.isArray(value) ? value[0] : value;
  return picked && picked.length > 0 ? picked : undefined;
}
