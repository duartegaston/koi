import type { Metadata } from "next";
import { Josefin_Sans, Source_Serif_4 } from "next/font/google";
import { getSiteUrl } from "@/lib/seo";
import { defaultOgImage, homeDescription, homeTitle, siteName } from "@/lib/site";
import "./globals.css";

const label = Josefin_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-josefin",
  display: "swap",
});

const publication = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-serif",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: homeTitle, template: `%s | ${siteName}` },
    description: homeDescription,
    applicationName: siteName,
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName,
      title: homeTitle,
      description: homeDescription,
      images: [{ url: defaultOgImage, alt: "koi. unidos x el chocolate", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: homeTitle,
      description: homeDescription,
      images: [defaultOgImage],
    },
  };
}

// Los secretos viven en el Worker, no en el build de Git. Sin esto Next
// prerenderiza páginas como /contacto y falla porque no hay .env.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${label.variable} ${publication.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans">{children}</body>
    </html>
  );
}
