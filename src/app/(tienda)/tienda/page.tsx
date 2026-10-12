import type { Metadata } from "next";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { getProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Productos",
  description: "Todos los chocolates de Koi, para envío en Posadas o retiro en el local.",
};

export default async function ShopPage() {
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
      <p className="font-label text-sm tracking-wide text-muted">Tienda</p>
      <h1 className="mt-3 text-5xl md:text-7xl">Productos</h1>
      <div className="mt-14 text-left">
        {products.length === 0 ? (
          <EmptyState title="Todavía no hay productos" body="Cuando se cargue el catálogo, vas a verlos acá." />
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
