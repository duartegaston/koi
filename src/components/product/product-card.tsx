import Link from "next/link";
import { ProductImage } from "@/components/product/product-image";
import { formatArs } from "@/lib/money";

type CardProduct = {
  id: string;
  name: string;
  slug: string;
  price: string;
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

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-surface">
        <ProductImage src={image?.url ?? null} alt="" priority={priority} />
      </div>
      <h3 className="mt-4 text-center font-display text-xl leading-snug">{product.name}</h3>
      <p className="mt-1 text-center font-label text-base tabular-nums">{formatArs(product.price)}</p>
    </Link>
  );
}
