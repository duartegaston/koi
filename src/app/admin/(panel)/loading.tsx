export default function AdminLoading() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <p className="sr-only">Cargando</p>
      <div className="h-10 w-48 bg-surface motion-safe:animate-pulse" />
      <div className="mt-8 h-40 bg-surface motion-safe:animate-pulse" />
    </div>
  );
}
