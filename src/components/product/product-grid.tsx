import { ProductCard } from "@/components/product/product-card";
import type { CatalogProduct } from "@/data-access/product.repository";

export function FeaturedRail({ products }: { products: CatalogProduct[] }) {
  return (
    <ul className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-2 md:px-8">
      {products.map((product, index) => (
        <li key={product.id} className="w-[72vw] shrink-0 snap-start sm:w-64 md:w-72">
          <ProductCard product={product} priority={index < 2} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGrid({ products, priorityCount = 2 }: { products: CatalogProduct[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
