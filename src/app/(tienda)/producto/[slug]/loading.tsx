export default function Loading() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 md:grid-cols-2 md:py-16" aria-busy="true">
      <p className="sr-only">Cargando</p>
      <div className="aspect-[3/4] bg-surface motion-safe:animate-pulse" />
      <div className="space-y-4">
        <div className="h-4 w-24 bg-surface motion-safe:animate-pulse" />
        <div className="h-12 w-2/3 bg-surface motion-safe:animate-pulse" />
        <div className="h-6 w-32 bg-surface motion-safe:animate-pulse" />
        <div className="h-24 w-full bg-surface motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
