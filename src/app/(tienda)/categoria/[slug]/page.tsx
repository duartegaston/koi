import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { JsonLd } from "@/components/ui/json-ld";
import { getCategories, getProducts } from "@/lib/catalog";
import { breadcrumbJsonLd, describePage, itemListJsonLd, pageMetadata } from "@/lib/seo";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

function categoryTitle(name: string): string {
  if (/chocolate/i.test(name)) return `${name} Rapanui con envío en Posadas`;
  return `${name}, chocolates Rapanui en Posadas`;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((item) => item.slug === slug);
  if (!category) notFound();
  return pageMetadata({
    title: categoryTitle(category.name),
    description: describePage(category.description ?? ""),
    path: `/categoria/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = (await getCategories()).find((item) => item.slug === slug);
  if (!category) notFound();

  const products = (await getProducts(slug)).toSorted((a, b) => Number(a.stock <= 0) - Number(b.stock <= 0));

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: category.name, path: `/categoria/${category.slug}` },
        ])}
      />
      <JsonLd
        data={itemListJsonLd(
          category.name,
          products.map((product) => ({ name: product.name, path: `/producto/${product.slug}` })),
        )}
      />
      <p className="font-label text-sm tracking-wide text-muted">Categoría</p>
      <h1 className="mt-3 text-5xl md:text-7xl">{category.name}</h1>
      {category.description ? (
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted">{category.description}</p>
      ) : null}
      <div className="mt-14 text-left">
        {products.length === 0 ? (
          <EmptyState title="Esta categoría está vacía" body="Cuando haya productos acá, los vas a ver en esta grilla." />
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
