import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { getCategories, getProducts } from "@/lib/catalog";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((item) => item.slug === slug);
  if (!category) notFound();
  return {
    title: category.name,
    description: category.description ?? category.name,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = (await getCategories()).find((item) => item.slug === slug);
  if (!category) notFound();

  const products = (await getProducts(slug)).toSorted((a, b) => Number(a.stock <= 0) - Number(b.stock <= 0));

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
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
