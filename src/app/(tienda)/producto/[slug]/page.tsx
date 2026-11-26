import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/product/add-to-cart";
import { GiftCardForm } from "@/components/product/gift-card-form";
import { ProductGallery } from "@/components/product/gallery";
import { JsonLd } from "@/components/ui/json-ld";
import { getProduct } from "@/lib/catalog";
import { formatArs } from "@/lib/money";
import { isNavidadCategory, NAVIDAD_ORDER_NOTE, showsAsAvailable } from "@/lib/navidad";
import { safeImageUrl } from "@/lib/safe-url";
import { breadcrumbJsonLd, describePage, pageMetadata, productJsonLd } from "@/lib/seo";
import { formatProductName } from "@/lib/utils";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const images = product.images.flatMap((image) => {
    const url = safeImageUrl(image.url);
    return url ? [{ url, alt: image.alt ?? product.name }] : [];
  });
  return pageMetadata({
    title: product.name,
    description: describePage(product.description),
    path: `/producto/${product.slug}`,
    images,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const available = showsAsAvailable(product.stock, product.categorySlug, product.customAmount);
  const navidad = isNavidadCategory(product.categorySlug);

  return (
    <article className="mx-auto grid max-w-6xl gap-10 px-6 py-10 md:grid-cols-2 md:gap-16 md:py-16">
      <JsonLd data={productJsonLd(product)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: product.categoryName, path: `/categoria/${product.categorySlug}` },
          { name: product.name, path: `/producto/${product.slug}` },
        ])}
      />
      <ProductGallery images={product.images} name={product.name} muted={!available} />
      <div>
        <Link href={`/categoria/${product.categorySlug}`} className="font-label text-sm tracking-wide text-muted underline-offset-4 hover:underline">
          {product.categoryName}
        </Link>
        <h1 className="mt-3 text-4xl md:text-6xl">{formatProductName(product.name)}</h1>
        <p className="mt-4 font-label text-xl tabular-nums">
          {product.customAmount ? "Elegí el monto" : formatArs(product.price)}
        </p>
        <p className="mt-6 max-w-prose text-base leading-relaxed whitespace-pre-wrap text-muted">{product.description}</p>
        {product.customAmount ? null : (
          <p className="mt-6 text-sm">
            {navidad
              ? NAVIDAD_ORDER_NOTE
              : product.stock > 0
                ? `Hay ${product.stock === 1 ? "1 unidad" : `${product.stock} unidades`} en stock.`
                : "Sin stock."}
          </p>
        )}
        {!product.customAmount && product.maxPerOrder ? (
          <p className="mt-1 text-sm text-muted">Máximo {product.maxPerOrder} por pedido.</p>
        ) : null}
        {product.customAmount ? (
          <GiftCardForm
            productId={product.id}
            name={product.name}
            slug={product.slug}
            imageUrl={product.images[0]?.url ?? null}
            stock={product.stock}
            categorySlug={product.categorySlug}
          />
        ) : (
          <AddToCart
            productId={product.id}
            name={product.name}
            slug={product.slug}
            price={product.price}
            imageUrl={product.images[0]?.url ?? null}
            stock={product.stock}
            categorySlug={product.categorySlug}
            maxPerOrder={product.maxPerOrder}
          />
        )}
      </div>
    </article>
  );
}
