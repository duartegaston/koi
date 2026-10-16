import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { EmptyState } from "@/components/ui/empty-state";
import { listBestSellingProducts } from "@/data-access/admin-order.repository";

export default async function BestSellersPage() {
  const products = await listBestSellingProducts();

  return (
    <AdminPage title="Más vendidos">
      <p className="mb-6 max-w-lg text-sm text-muted">
        Unidades de pedidos pagados y entregados, de mayor a menor.
      </p>
      {products.length === 0 ? (
        <EmptyState title="Todavía no hay ventas" body="Cuando se cobre un pedido, el producto va a aparecer acá." />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {products.map((product) => (
            <li key={product.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
              <Link href={`/admin/productos/${product.id}`} className="min-w-0 break-words underline underline-offset-4">
                {product.name}
              </Link>
              <span className="tabular-nums">{product.sold}</span>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
