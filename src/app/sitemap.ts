import type { MetadataRoute } from "next";
import { getCatalogIndex } from "@/lib/catalog";
import { getSiteUrl, publicImageUrls } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const { categories, products } = await getCatalogIndex();

  return [
    { url: site, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/tienda`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/contacto`, changeFrequency: "monthly", priority: 0.6 },
    ...categories.map((category) => ({
      url: `${site}/categoria/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${site}/producto/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: publicImageUrls(product.images, site),
    })),
  ];
}
