export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16" aria-busy="true">
      <p className="sr-only">Cargando</p>
      <div className="h-10 w-48 bg-surface motion-safe:animate-pulse" />
      <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index}>
            <div className="aspect-[3/4] bg-surface motion-safe:animate-pulse" />
            <div className="mx-auto mt-4 h-5 w-24 bg-surface motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
