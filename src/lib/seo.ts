import "server-only";

import type { Metadata } from "next";
import { getServerEnv } from "@/lib/env";
import { fromCents, toCents } from "@/lib/money";
import { safeImageUrl } from "@/lib/safe-url";
import {
  catalogDescription,
  defaultOgImage,
  homeDescription,
  instagramUrl,
  openingHours,
  publishedSiteUrl,
  siteName,
} from "@/lib/site";

const ogImageAlt = "koi. unidos x el chocolate";

export function getSiteUrl(): string {
  try {
    return stripTrailingSlash(getServerEnv().APP_URL);
  } catch {
    const fromProcess = process.env.APP_URL?.trim();
    return stripTrailingSlash(fromProcess ? fromProcess : publishedSiteUrl);
  }
}

export function absoluteUrl(pathOrUrl: string, site = getSiteUrl()): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${site}${path}`;
}

export function clampMetaDescription(value: string): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= 155) return text;
  const cut = text.slice(0, 152);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 100 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

export function describePage(lead: string, supplement = catalogDescription): string {
  const primary = lead.replace(/\s+/g, " ").trim();
  const extra = supplement.replace(/\s+/g, " ").trim();
  const text = primary.length >= 120 ? primary : [primary, extra].filter(Boolean).join(" ");
  return clampMetaDescription(text);
}

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  index = true,
  images,
}: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  index?: boolean;
  images?: { url: string; alt: string; width?: number; height?: number }[];
}): Metadata {
  const ogImages = (
    images?.length ? images : [{ url: defaultOgImage, alt: ogImageAlt, width: 1200, height: 630 }]
  ).slice(0, 4);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    robots: { index, follow: index },
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName,
      url: path,
      title,
      description,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages.map((image) => image.url),
    },
  };
}

export function publicImageUrls(urls: string[], site = getSiteUrl()): string[] {
  return urls.flatMap((url) => {
    const safe = safeImageUrl(url);
    return safe ? [absoluteUrl(safe, site)] : [];
  });
}

export function localBusinessJsonLd() {
  const site = getSiteUrl();
  const env = getServerEnv();

  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: siteName,
    description: homeDescription,
    url: site,
    image: absoluteUrl(defaultOgImage, site),
    logo: absoluteUrl("/brand/wordmark.png", site),
    telephone: `+${env.WHATSAPP_NUMBER}`,
    currenciesAccepted: "ARS",
    address: {
      "@type": "PostalAddress",
      ...(env.STORE_PICKUP_ADDRESS ? { streetAddress: env.STORE_PICKUP_ADDRESS } : {}),
      addressLocality: "Posadas",
      addressRegion: "Misiones",
      addressCountry: "AR",
    },
    areaServed: {
      "@type": "City",
      name: "Posadas",
    },
    sameAs: [instagramUrl],
    openingHoursSpecification: openingHours.map((slot) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...slot.days],
      opens: slot.opens,
      closes: slot.closes,
    })),
  };
}

export function howToOrderJsonLd(steps: { title: string; body: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Cómo hacer un pedido en Koi",
    description: "Pasos para pedir chocolates Rapanui en Posadas, con envío o retiro en el local.",
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.body,
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const site = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, site),
    })),
  };
}

export function itemListJsonLd(name: string, items: { name: string; path: string }[]) {
  const site = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path, site),
    })),
  };
}

export function productJsonLd(product: {
  name: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  stock: number;
  categoryName: string;
  images: { url: string }[];
}) {
  const site = getSiteUrl();
  const url = absoluteUrl(`/producto/${product.slug}`, site);
  const images = publicImageUrls(
    product.images.map((image) => image.url),
    site,
  );
  const price = schemaPrice(product.price);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.slug,
    category: product.categoryName,
    image: images.length > 0 ? images : undefined,
    brand: { "@type": "Brand", name: siteName },
    offers: price
      ? {
          "@type": "Offer",
          url,
          priceCurrency: product.currency,
          price,
          availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
          seller: { "@type": "Organization", name: siteName, url: site },
        }
      : undefined,
  };
}

function schemaPrice(price: string): string | null {
  try {
    return fromCents(toCents(price));
  } catch {
    return null;
  }
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
