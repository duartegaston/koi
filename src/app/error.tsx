"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <h1 className="text-5xl uppercase leading-none">Algo salió mal</h1>
      <p className="mt-3 text-sm text-muted">No pudimos cargar esta página.</p>
      <Button variant="secondary" className="mt-8" onClick={reset}>
        Reintentar
      </Button>
    </section>
  );
}
