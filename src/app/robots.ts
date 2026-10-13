import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/checkout/", "/api/"],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
