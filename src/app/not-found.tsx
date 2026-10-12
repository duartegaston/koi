import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <h1 className="text-5xl uppercase leading-none">Página no encontrada</h1>
      <Link href="/" className="mt-6 text-sm underline underline-offset-4">
        Volver al inicio
      </Link>
    </section>
  );
}
