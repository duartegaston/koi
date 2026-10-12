export default function Loading() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16" aria-busy="true">
      <p className="sr-only">Cargando</p>
      <div className="h-10 w-40 bg-surface motion-safe:animate-pulse" />
      <div className="mt-8 h-64 bg-surface motion-safe:animate-pulse" />
    </div>
  );
}
