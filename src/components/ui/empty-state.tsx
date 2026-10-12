export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-surface px-6 py-16 text-center">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
