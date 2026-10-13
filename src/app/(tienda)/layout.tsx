import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { JsonLd } from "@/components/ui/json-ld";
import { localBusinessJsonLd } from "@/lib/seo";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={localBusinessJsonLd()} />
      <a
        href="#contenido"
        className="absolute top-4 left-4 z-50 -translate-y-24 rounded-full bg-ink px-4 py-2 text-sm text-paper focus:translate-y-0"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
