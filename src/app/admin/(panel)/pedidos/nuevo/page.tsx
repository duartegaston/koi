import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { ManualOrderForm } from "@/components/forms/manual-order-form";
import { EmptyState } from "@/components/ui/empty-state";
import { listManualOrderProducts } from "@/data-access/admin-product.repository";

export default async function NewManualOrderPage() {
  const products = await listManualOrderProducts();

  return (
    <AdminPage title="Cargar pedido">
      <p className="text-sm text-muted">
        <Link href="/admin/pedidos" className="underline underline-offset-4">
          Pedidos
        </Link>
      </p>
      <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
        Para un pedido que llegó por WhatsApp. Queda pagado, con retiro en el local, y se descuenta el stock. Si pedís
        más de lo que hay, el stock llega a cero y el resto queda a pedido.
      </p>
      {products.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No hay productos" body="Cargá un producto antes de registrar un pedido." />
        </div>
      ) : (
        <div className="mt-8">
          <ManualOrderForm products={products} />
        </div>
      )}
    </AdminPage>
  );
}
