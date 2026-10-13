import type { Metadata } from "next";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import type { CatalogProduct } from "@/data-access/product.repository";
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
      <div className="mt-14 space-y-16 text-left">
        {products.length === 0 ? (
          <EmptyState title="Todavía no hay productos" body="Cuando se cargue el catálogo, vas a verlos acá." />
        ) : (
          groupInStockThenMadeToOrder(products).map((group, index) => (
            <section
              key={`${group.availability}-${group.slug}`}
              aria-labelledby={`categoria-${group.availability}-${group.slug}`}
            >
              <h2 id={`categoria-${group.availability}-${group.slug}`} className="text-center text-3xl md:text-4xl">
                {group.name}
              </h2>
              <div className="mt-8">
                <ProductGrid products={group.products} priorityCount={index === 0 ? 2 : 0} />
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function groupInStockThenMadeToOrder(products: CatalogProduct[]) {
  return [
    ...groupByCategory(
      products.filter((product) => product.stock > 0),
      "stock",
    ),
    ...groupByCategory(
      products.filter((product) => product.stock <= 0),
      "pedido",
    ),
  ];
}

function groupByCategory(products: CatalogProduct[], availability: "stock" | "pedido") {
  const groups: { availability: "stock" | "pedido"; slug: string; name: string; products: CatalogProduct[] }[] = [];
  for (const product of products) {
    const current = groups.at(-1);
    if (current?.slug === product.categorySlug) {
      current.products.push(product);
    } else {
      groups.push({ availability, slug: product.categorySlug, name: product.categoryName, products: [product] });
    }
  }
  return groups;
}
