import type { Metadata } from "next";
import { Josefin_Sans, Source_Serif_4 } from "next/font/google";
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

export const metadata: Metadata = {
  title: { default: "Koi", template: "%s | Koi" },
  description: "Pedidos con envío dentro de Posadas o retiro en el local.",
};

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
