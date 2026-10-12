import { AdminPage } from "@/components/admin/admin-page";
import { StockRow } from "@/components/forms/stock-row";
import { EmptyState } from "@/components/ui/empty-state";
import { listStockProducts } from "@/data-access/admin-product.repository";
import { lowStockThreshold } from "@/lib/stock";

export default async function StockPage() {
  const products = await listStockProducts();

  return (
    <AdminPage title="Stock">
      <p className="mb-6 max-w-lg text-sm text-muted">
        El número es el stock actual. Guardar lo reemplaza. Se marca cuando queda en {lowStockThreshold} o menos.
      </p>
      {products.length === 0 ? (
        <EmptyState title="No hay productos" body="Cargá un producto para llevar el stock." />
      ) : (
        <div>
          {products.map((product) => (
            <StockRow key={product.id} id={product.id} name={product.name} stock={product.stock} isActive={product.isActive} />
          ))}
        </div>
      )}
    </AdminPage>
  );
}
