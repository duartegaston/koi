import Link from "next/link";
import { Wordmark } from "@/components/layout/wordmark";

export function Footer() {
  return (
    <footer className="border-t border-line bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark withTagline />
          <p className="mt-4 max-w-xs text-base leading-relaxed text-muted">
            Envío dentro de Posadas, Misiones, o retiro en el local.
          </p>
        </div>
        <nav className="flex flex-col gap-3 text-sm">
          <p className="font-label text-sm tracking-wide text-muted">Tienda</p>
          <Link href="/#tienda" className="w-fit underline-offset-4 hover:underline">
            Ver productos
          </Link>
          <Link href="/contacto" className="w-fit underline-offset-4 hover:underline">
            Contacto
          </Link>
        </nav>
        <p className="text-sm leading-relaxed text-muted md:justify-self-end">Posadas, Misiones</p>
      </div>
    </footer>
  );
}
