"use client";

import { useState } from "react";
import { ProductImage } from "@/components/product/product-image";
import { cn } from "@/lib/utils";

type GalleryImage = { url: string; alt: string | null };

export function ProductGallery({
  images,
  name,
  muted = false,
}: {
  images: GalleryImage[];
  name: string;
  muted?: boolean;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden bg-surface">
        <ProductImage src={current?.url ?? null} alt={current?.alt ?? name} priority muted={muted} />
      </div>
      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <li key={`${image.url}-${index}`}>
              <button
                type="button"
                aria-label={`Ver imagen ${index + 1} de ${name}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => setActive(index)}
                className={cn(
                  "relative h-16 w-16 overflow-hidden bg-surface",
                  index === active && "outline-2 outline-offset-2 outline-foreground",
                )}
              >
                <ProductImage src={image.url} alt="" muted={muted} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
