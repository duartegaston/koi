import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-semibold tracking-tight">Koi</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Next.js + Tailwind + Drizzle (Neon) + Resend + WhatsApp Cloud API, desplegado en Cloudflare Pages.
      </p>
      <Link href="/contacto" className="w-fit underline underline-offset-4">
        Ir al formulario de contacto →
      </Link>
    </main>
  );
}
