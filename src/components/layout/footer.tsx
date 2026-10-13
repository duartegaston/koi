import Link from "next/link";
import { Wordmark } from "@/components/layout/wordmark";

const instagramHref = "https://www.instagram.com/koi.chocolates?dlrf=djhhanE4OXNqbXAy&utm_source=qr";

export function Footer() {
  return (
    <footer className="border-t border-line bg-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark withTagline taglineBelow taglineTone="primary" taglineFromLg={false} logoHeight="6.5rem" />
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
        <div className="flex flex-col items-start gap-4 text-sm leading-relaxed text-muted">
          <p>Posadas, Misiones</p>
          <div>
            <p className="font-label tracking-wide">Horarios</p>
            <p>Lu a vi de 10:30 a 16 y 20 a 23.</p>
            <p>Sa de 11:30 a 15 y 18:30 a 20:30.</p>
          </div>
          <a
            href={instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram de Koi"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <InstagramIcon />
          </a>
        </div>
      </div>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" />
    </svg>
  );
}
