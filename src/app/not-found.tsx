import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <Link href="/" className="underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}
