import Link from "next/link";
import { ProductImage } from "@/components/product/product-image";
import { formatArs } from "@/lib/money";
import { productAvailabilityLabel, showsAsAvailable } from "@/lib/navidad";
import { formatProductName } from "@/lib/utils";

type CardProduct = {
  id: string;
  name: string;
  slug: string;
  price: string;
  stock: number;
  categorySlug: string;
  images: { url: string }[];
};

export function ProductCard({
  product,
  priority = false,
}: {
  product: CardProduct;
  priority?: boolean;
}) {
  const image = product.images[0];
  const available = showsAsAvailable(product.stock, product.categorySlug);

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-surface">
        <ProductImage src={image?.url ?? null} alt="" priority={priority} muted={!available} />
      </div>
      <h3 className="mt-4 text-center font-display text-xl leading-snug">
        {formatProductName(product.name)}
      </h3>
      <p className="mt-1 text-center font-label text-base tabular-nums">{formatArs(product.price)}</p>
      <p className="mt-1 text-center text-sm">{productAvailabilityLabel(product.stock, product.categorySlug)}</p>
    </Link>
  );
}
