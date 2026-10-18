import type { Metadata } from "next";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { JsonLd } from "@/components/ui/json-ld";
import type { CatalogProduct } from "@/data-access/product.repository";
import { getProducts } from "@/lib/catalog";
import { breadcrumbJsonLd, itemListJsonLd, pageMetadata } from "@/lib/seo";
import { shopDescription, shopTitle } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: shopTitle,
  description: shopDescription,
  path: "/tienda",
});

export default async function ShopPage() {
  const products = await getProducts();
  const inStock = groupByCategory(
    products.filter((product) => product.stock > 0),
    "stock",
  );
  const madeToOrder = groupByCategory(
    products.filter((product) => product.stock <= 0),
    "pedido",
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Productos", path: "/tienda" },
        ])}
      />
      <JsonLd
        data={itemListJsonLd(
          "Productos",
          [...inStock, ...madeToOrder].flatMap((group) =>
            group.products.map((product) => ({ name: product.name, path: `/producto/${product.slug}` })),
          ),
        )}
      />
      <p className="font-label text-sm tracking-wide text-muted">Tienda</p>
      <h1 className="mt-3 text-5xl md:text-7xl">Productos</h1>
      <div className="mt-14 space-y-16 text-left">
        {products.length === 0 ? (
          <EmptyState title="Todavía no hay productos" body="Cuando se cargue el catálogo, vas a verlos acá." />
        ) : (
          <>
            {inStock.map((group, index) => (
              <CategoryGroup
                key={`${group.availability}-${group.slug}`}
                group={group}
                priorityCount={index === 0 ? 2 : 0}
              />
            ))}
            {madeToOrder.length > 0 ? (
              <section aria-labelledby="sin-stock" className="space-y-16">
                <header className="text-center">
                  <h2 id="sin-stock" className="text-3xl md:text-4xl">
                    Sin stock
                  </h2>
                  <p className="mt-3 text-sm text-muted">A pedido · 7 a 10 días hábiles</p>
                </header>
                {madeToOrder.map((group) => (
                  <CategoryGroup key={`${group.availability}-${group.slug}`} group={group} compact priorityCount={0} />
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

type CategoryProducts = { availability: "stock" | "pedido"; slug: string; name: string; products: CatalogProduct[] };

function CategoryGroup({
  group,
  compact = false,
  priorityCount,
}: {
  group: CategoryProducts;
  compact?: boolean;
  priorityCount: number;
}) {
  const id = `categoria-${group.availability}-${group.slug}`;

  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={compact ? "text-center text-2xl md:text-3xl" : "text-center text-3xl md:text-4xl"}>
        {group.name}
      </h2>
      <div className="mt-8">
        <ProductGrid products={group.products} priorityCount={priorityCount} />
      </div>
    </section>
  );
}

function groupByCategory(products: CatalogProduct[], availability: "stock" | "pedido") {
  const groups: CategoryProducts[] = [];
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
