import Image from "next/image";
import Link from "next/link";
import { FeaturedRail } from "@/components/product/product-grid";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Marquee } from "@/components/ui/marquee";
import { getProducts } from "@/lib/catalog";
import { storeContactWhatsAppUrl } from "@/lib/whatsapp/link";

const ticker = ["Chocolates Rapanui", "Envío en Posadas"];

const steps = [
  {
    title: "Los productos",
    body: "Seleccioná los productos. Si no hay stock, los pedimos por vos. Llegan entre 7 y 10 días hábiles.",
  },
  {
    title: "Tus datos",
    body: "Cargá tus datos.",
  },
  {
    title: "El pago",
    body: "El envío se paga por transferencia. En el retiro podés elegir transferencia o efectivo.",
  },
  {
    title: "La entrega",
    body: "Elegí envío o retiro por el local.",
  },
  {
    title: "WhatsApp",
    body: "Para finalizar, envianos el pedido por WhatsApp a través del link.",
  },
];

export default async function HomePage() {
  const featured = await getProducts(undefined, true);
  const products = featured.length > 0 ? featured : (await getProducts()).slice(0, 8);
  const contactHref = storeContactWhatsAppUrl();

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
        <h1 className="mt-8 max-w-xl text-4xl sm:text-5xl">Chocolates Rapanui en Posadas</h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-sand">
          Pedidos con envío dentro de la ciudad, o retiro en el local.
        </p>
        <a href="#tienda" className={`${buttonClass.primary} mt-10`}>
          Productos destacados
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
        <h2 className="text-4xl sm:text-6xl">Unidos x el chocolate</h2>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed">
          Koi es un emprendimiento chocolatero nacido de la unión de una pareja y de la pasión por compartir algo
          especial. Busca acercar a los consumidores de Posadas chocolates y propuestas que se diferencien de las
          opciones habituales, convirtiendo cada compra en una experiencia sensorial y emocional.
        </p>
        <Link href="/tienda" className={`${buttonClass.primary} mt-10`}>
          Entrar a la tienda
        </Link>
      </section>

      <Marquee items={["Hecho para retirar", "O para que te lo lleven"]} tone="ink" />

      <section id="tienda" className="scroll-mt-20 py-16 md:py-24">
        <h2 className="px-6 text-center text-4xl sm:text-5xl">Productos destacados</h2>
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

      <section className="bg-primary px-6 py-16 text-primary-foreground md:py-24">
        <h2 className="text-center text-4xl sm:text-5xl">Cómo se pide</h2>
        <ol className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className={`step-card rounded-3xl bg-paper p-6 text-foreground shadow-[0_18px_40px_-28px_rgba(34,54,68,0.85)] transition duration-300 motion-safe:hover:-translate-y-1.5 motion-safe:hover:shadow-[0_28px_50px_-24px_rgba(34,54,68,0.7)] ${
                index === 3 ? "lg:col-span-2 lg:col-start-2" : index === 4 ? "lg:col-span-2 lg:col-start-4" : "lg:col-span-2"
              }`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <p className="font-display text-5xl text-primary">{index + 1}</p>
              <h3 className="mt-4 font-display text-2xl">{step.title}</h3>
              <p className="mt-3 text-base leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-ink px-6 py-20 text-center md:py-28">
        <h2 className="text-4xl text-primary sm:text-6xl">Escribinos</h2>
        <p className="mx-auto mt-6 max-w-sm text-xl leading-relaxed text-primary">
          Una consulta, un pedido, un retiro. Te respondemos por WhatsApp.
        </p>
        <a href={contactHref} target="_blank" rel="noopener noreferrer" className={`${buttonClass.inverse} mt-10`}>
          Contacto
        </a>
      </section>
    </>
  );
}
