import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: { default: "Koi", template: "%s | Koi" },
  description: "Koi",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={geistSans.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
