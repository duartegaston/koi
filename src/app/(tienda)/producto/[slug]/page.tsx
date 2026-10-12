import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/product/add-to-cart";
import { ProductGallery } from "@/components/product/gallery";
import { formatArs } from "@/lib/money";
import { getProduct } from "@/lib/catalog";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return {
    title: product.name,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <article className="mx-auto grid max-w-6xl gap-10 px-6 py-10 md:grid-cols-2 md:gap-16 md:py-16">
      <ProductGallery images={product.images} name={product.name} />
      <div>
        <Link href={`/categoria/${product.categorySlug}`} className="font-label text-sm tracking-wide text-muted underline-offset-4 hover:underline">
          {product.categoryName}
        </Link>
        <h1 className="mt-3 text-4xl md:text-6xl">{product.name}</h1>
        <p className="mt-4 font-label text-xl tabular-nums">{formatArs(product.price)}</p>
        <p className="mt-6 max-w-prose text-base leading-relaxed whitespace-pre-wrap text-muted">{product.description}</p>
        <p className="mt-6 text-sm">
          {product.stock > 0
            ? `Hay ${product.stock === 1 ? "1 unidad" : `${product.stock} unidades`} en stock.`
            : "Sin stock."}
        </p>
        {product.maxPerOrder ? <p className="mt-1 text-sm text-muted">Máximo {product.maxPerOrder} por pedido.</p> : null}
        <AddToCart productId={product.id} stock={product.stock} maxPerOrder={product.maxPerOrder} />
      </div>
    </article>
  );
}
