import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/services/admin-auth.service";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <a
        href="#contenido"
        className="absolute top-4 left-4 z-50 -translate-y-24 rounded-full bg-ink px-4 py-2 text-sm text-paper focus:translate-y-0"
      >
        Saltar al contenido
      </a>
      <AdminNav />
      <main id="contenido" className="flex-1">
        {children}
      </main>
    </div>
  );
}
