import { DeliveryNotice } from "@/components/layout/delivery-notice";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { JsonLd } from "@/components/ui/json-ld";
import { localBusinessJsonLd } from "@/lib/seo";
import { readDeliveriesPaused } from "@/services/store-settings.service";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const deliveriesPaused = await readDeliveriesPaused();

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
      {deliveriesPaused ? <DeliveryNotice /> : null}
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
