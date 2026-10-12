import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminProducts } from "@/data-access/admin-product.repository";
import { formatArs } from "@/lib/money";
import { safeImageUrl } from "@/lib/safe-url";

export default async function ProductsPage() {
  const products = await listAdminProducts();

  return (
    <AdminPage
      title="Productos"
      action={
        <Link href="/admin/productos/nuevo" className={buttonClass.primary}>
          Cargar producto
        </Link>
      }
    >
      {products.length === 0 ? (
        <EmptyState title="No hay productos" body="Cargá el primero para verlo en la tienda." />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {products.map((product) => {
            const image = product.images[0];
            const src = image ? safeImageUrl(image.url) : null;
            return (
              <li key={product.id}>
                <Link href={`/admin/productos/${product.id}`} className="flex items-center gap-4 py-4">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="h-20 w-16 bg-surface object-cover" />
                  ) : (
                    <span className="h-20 w-16 bg-surface" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{product.name}</span>
                    <span className="mt-1 block text-sm text-muted">
                      {product.categoryName}
                      {product.isActive ? "" : " · Oculto"}
                      {product.stock === 0 ? " · Sin stock" : ` · Stock ${product.stock}`}
                    </span>
                  </span>
                  <span className="text-sm">{formatArs(product.price)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminPage>
  );
}
