export function AdminPage({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">{title}</h1>
        {action}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
