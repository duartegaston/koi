import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/forms/admin-login-form";
import { Wordmark } from "@/components/layout/wordmark";
import { buttonClass } from "@/components/ui/button";
import { readAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Entrar" };

export default async function AdminLoginPage() {
  if (await readAdminSession()) redirect("/admin");

  return (
    <main id="contenido" className="flex min-h-dvh flex-1 flex-col bg-ink px-6 py-8 text-paper">
      <Wordmark onInk withTagline priority />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="font-label text-sm tracking-wide text-sand">Administración</p>
        <h1 className="mt-4 text-5xl sm:text-6xl">Entrar</h1>
        <p className="mt-4 max-w-xs text-base leading-relaxed text-sand">Productos, stock y pedidos del local.</p>
        <div className="mt-10 w-full bg-background px-6 py-8 text-left text-foreground">
          <AdminLoginForm />
        </div>
        <Link href="/" className={`${buttonClass.inverse} mt-8`}>
          Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
