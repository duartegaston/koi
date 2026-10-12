import Image from "next/image";
import Link from "next/link";
import { FeaturedRail } from "@/components/product/product-grid";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Marquee } from "@/components/ui/marquee";
import { getCategories, getProducts } from "@/lib/catalog";

const ticker = ["Chocolates Rapanui", "Envío en Posadas", "Retiro en el local", "Mercado Pago"];

const notes = [
  {
    title: "Envío",
    body: "Si estás en Posadas, el pedido sale del local y llega dentro de la ciudad.",
  },
  {
    title: "Retiro",
    body: "También podés pasar a buscarlo. El local te confirma el horario por WhatsApp.",
  },
  {
    title: "Pago",
    body: "Transferencia o Mercado Pago. El pedido queda anotado y el local lo confirma.",
  },
];

export default async function HomePage() {
  const featured = await getProducts(undefined, true);
  const products = featured.length > 0 ? featured : (await getProducts()).slice(0, 8);
  const categories = await getCategories();
  const shopHref = categories[0] ? `/categoria/${categories[0].slug}` : "#tienda";

  return (
    <>
      <section className="relative flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center bg-ink px-6 pt-16 pb-36 text-center text-paper">
        <Image
          src="/brand/lockup.png"
          alt="koi. unidos x el chocolate"
          width={1100}
          height={792}
          priority
          sizes="(min-width: 768px) 28rem, 16rem"
          className="h-auto w-full max-w-64 md:max-w-md"
          style={{ width: "100%", height: "auto" }}
        />
        <p className="mt-8 font-label text-sm tracking-wide text-sand">Posadas, Misiones</p>
        <h1 className="mt-3 max-w-xl text-4xl sm:text-5xl">Chocolates en Posadas</h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-sand">
          Pedidos con envío dentro de la ciudad, o retiro en el local.
        </p>
        <a href="#tienda" className={`${buttonClass.primary} mt-10`}>
          Ver la tienda
        </a>
        <svg
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-8 w-full text-background md:h-12"
        >
          <path d="M0 24c120 24 240 24 360 0s240-24 360 0 240 24 360 0 240-24 360 0v24H0Z" fill="currentColor" />
        </svg>
      </section>

      <Marquee items={ticker} />

      <section className="bg-surface px-6 py-20 text-center md:py-28">
        <h2 className="text-4xl sm:text-6xl">Cerca de casa</h2>
        <p className="mx-auto mt-6 max-w-md text-base leading-relaxed">
          El pedido no sale de un depósito lejano. Sale del local, y si estás en Posadas te lo llevamos.
        </p>
        <Link href={shopHref} className={`${buttonClass.primary} mt-10`}>
          Entrar a la tienda
        </Link>
      </section>

      <Marquee items={["Hecho para retirar", "O para que te lo lleven"]} tone="ink" />

      <section id="tienda" className="scroll-mt-20 py-16 md:py-24">
        <h2 className="px-6 text-center text-4xl sm:text-5xl">Chocolates</h2>
        <div className="mt-10">
          {products.length === 0 ? (
            <div className="px-6">
              <EmptyState title="Todavía no hay productos" body="Cuando se cargue el catálogo, vas a verlos acá." />
            </div>
          ) : (
            <FeaturedRail products={products} />
          )}
        </div>
      </section>

      <Marquee items={ticker} />

      <section className="px-6 py-16 md:py-24">
        <h2 className="text-center text-4xl sm:text-5xl">Cómo se pide</h2>
        <ol className="mx-auto mt-12 grid max-w-5xl gap-10 md:grid-cols-3">
          {notes.map((note, index) => (
            <li key={note.title}>
              <p className="font-display text-5xl text-muted">{index + 1}</p>
              <h3 className="mt-4 font-display text-2xl">{note.title}</h3>
              <p className="mt-3 max-w-xs text-base leading-relaxed text-muted">{note.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-ink px-6 py-20 text-center text-paper md:py-28">
        <h2 className="text-4xl sm:text-6xl">Escribinos</h2>
        <p className="mx-auto mt-6 max-w-sm text-base leading-relaxed text-sand">
          Una consulta, un pedido, un retiro. Te respondemos por WhatsApp.
        </p>
        <Link href="/contacto" className={`${buttonClass.inverse} mt-10`}>
          Contacto
        </Link>
      </section>
    </>
  );
}
