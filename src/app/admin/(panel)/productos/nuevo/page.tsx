import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";
import { ProductForm } from "@/components/forms/product-form";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminCategories } from "@/data-access/admin-product.repository";

export default async function NewProductPage() {
  const categories = await listAdminCategories();

  return (
    <AdminPage title="Nuevo producto">
      {categories.length === 0 ? (
        <div className="space-y-6">
          <EmptyState title="Falta una categoría" body="El producto necesita una categoría antes de cargarse." />
          <Link href="/admin/categorias" className={buttonClass.primary}>
            Ir a categorías
          </Link>
        </div>
      ) : (
        <ProductForm categories={categories} />
      )}
    </AdminPage>
  );
}
