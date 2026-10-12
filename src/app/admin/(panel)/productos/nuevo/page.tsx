import { AdminPage } from "@/components/admin/admin-page";
import { ProductForm } from "@/components/forms/product-form";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminCategories } from "@/data-access/admin-product.repository";

export default async function NewProductPage() {
  const categories = await listAdminCategories();

  return (
    <AdminPage title="Nuevo producto">
      {categories.length === 0 ? (
        <EmptyState title="Falta una categoría" body="El producto necesita una categoría cargada en la base." />
      ) : (
        <ProductForm categories={categories} />
      )}
    </AdminPage>
  );
}
