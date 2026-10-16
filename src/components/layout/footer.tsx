import Link from "next/link";
import { Wordmark } from "@/components/layout/wordmark";
import { instagramUrl, storeEmail, storeHourLines } from "@/lib/site";
import { storeContactWhatsAppUrl } from "@/lib/whatsapp/link";

export function Footer() {
  const contactHref = storeContactWhatsAppUrl();

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
          <p className="font-label text-base tracking-wide text-muted">Tienda</p>
          <ul className="list-disc space-y-3 pl-4 marker:text-foreground">
            <li>
              <Link href="/tienda" className="underline-offset-4 hover:underline">
                Ver productos
              </Link>
            </li>
            <li>
              <a href={contactHref} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                Contacto
              </a>
            </li>
          </ul>
        </nav>
        <div className="flex flex-col items-start gap-4 text-sm leading-relaxed text-muted">
          <p>Posadas, Misiones</p>
          <a href={`mailto:${storeEmail}`} className="underline-offset-4 hover:underline">
            {storeEmail}
          </a>
          <div>
            <p className="font-label tracking-wide">Horarios</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 marker:text-muted">
              {storeHourLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de Koi"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <InstagramIcon />
            </a>
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp de Koi"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <WhatsAppIcon />
            </a>
          </div>
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

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M20 11.5A8.5 8.5 0 0 1 7.1 18.6L4 20l1.5-3A8.5 8.5 0 1 1 20 11.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.1 9.5c.2 1.3.9 2.4 1.9 3.3 1 .9 2.2 1.5 3.4 1.6.3 0 .6-.1.7-.4l.4-1c.1-.2 0-.4-.2-.5l-1.2-.5c-.2-.1-.4 0-.5.2l-.3.5c-.8-.4-1.5-1-1.8-1.8l.4-.3c.2-.1.3-.3.2-.5l-.5-1.2c-.1-.2-.3-.3-.5-.2l-.9.4c-.3.1-.5.4-.4.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
