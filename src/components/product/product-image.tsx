import { safeImageUrl } from "@/lib/safe-url";

type ProductImageProps = {
  src: string | null;
  alt: string;
  priority?: boolean;
};

export function ProductImage({ src, alt, priority = false }: ProductImageProps) {
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
      className="absolute inset-0 h-full w-full object-cover motion-safe:transition motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
    />
  );
}
