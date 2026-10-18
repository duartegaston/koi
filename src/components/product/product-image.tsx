import { safeImageUrl } from "@/lib/safe-url";
import { cn } from "@/lib/utils";

type ProductImageProps = {
  src: string | null;
  alt: string;
  priority?: boolean;
  /** Foto más apagada cuando el producto no tiene stock. */
  muted?: boolean;
};

export function ProductImage({ src, alt, priority = false, muted = false }: ProductImageProps) {
  const safe = src ? safeImageUrl(src) : null;
  if (!safe) return null;

  return (
    // Las fotos son URLs externas arbitrarias: no abrimos remotePatterns de next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={safe}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn(
        "absolute inset-0 h-full w-full object-cover motion-safe:transition motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]",
        muted && "saturate-[.3]",
      )}
    />
  );
}
