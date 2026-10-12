import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/admin-page";
import { DeleteProductButton } from "@/components/forms/delete-product-button";
import { ProductForm } from "@/components/forms/product-form";
import { findAdminProduct, listAdminCategories } from "@/data-access/admin-product.repository";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const [product, categories] = await Promise.all([findAdminProduct(id), listAdminCategories()]);
  if (!product) notFound();

  return (
    <AdminPage title={product.name}>
      <ProductForm categories={categories} product={product} />
      <div className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-2xl">Eliminar</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          Se oculta del catálogo. Si ya se vendió, el pedido conserva el nombre y el precio.
        </p>
        <div className="mt-4">
          <DeleteProductButton productId={product.id} />
        </div>
      </div>
    </AdminPage>
  );
}
