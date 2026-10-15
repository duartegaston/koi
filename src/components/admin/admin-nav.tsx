"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAdmin } from "@/actions/admin-auth";
import { Wordmark } from "@/components/layout/wordmark";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/mas-vendidos", label: "Más vendidos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/pedidos", label: "Pedidos" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-paper/20 bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-8">
        <Wordmark href="/admin" onInk priority />
        <nav aria-label="Administración" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {links.map((link) => {
            const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center font-label text-sm tracking-wide",
                  active ? "text-paper underline decoration-primary decoration-2 underline-offset-8" : "text-sand",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/" className="inline-flex min-h-11 items-center font-label text-sm tracking-wide text-sand">
            Ver tienda
          </Link>
          <form action={logoutAdmin}>
            <button type="submit" className="inline-flex min-h-11 items-center font-label text-sm tracking-wide text-paper">
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
