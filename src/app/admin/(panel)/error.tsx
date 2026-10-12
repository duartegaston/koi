"use client";

import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AdminPage title="Algo salió mal">
      <p className="text-sm text-muted">No pudimos cargar esta sección.</p>
      <Button variant="secondary" className="mt-6" onClick={reset}>
        Reintentar
      </Button>
    </AdminPage>
  );
}
