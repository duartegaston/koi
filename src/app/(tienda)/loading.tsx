export default function Loading() {
  return (
    <div aria-busy="true">
      <p className="sr-only">Cargando</p>
      <div className="min-h-[70dvh] bg-surface motion-safe:animate-pulse" />
      <div className="flex gap-5 overflow-hidden px-6 py-16">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="w-64 shrink-0">
            <div className="aspect-[3/4] bg-surface motion-safe:animate-pulse" />
            <div className="mx-auto mt-4 h-5 w-32 bg-surface motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
