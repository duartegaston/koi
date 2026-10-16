"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  { href: "/admin/inversion", label: "Inversión" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-paper/20 bg-ink text-paper">
      <div className="mx-auto flex w-full min-w-0 max-w-5xl items-center gap-3 px-4 py-3 md:flex-wrap md:gap-x-6 md:px-8">
        <Wordmark href="/admin" onInk priority className="shrink-0" logoHeight="2.75rem" />
        <nav aria-label="Administración" className="hidden flex-wrap items-center gap-x-4 gap-y-2 md:flex">
          {links.map((link) => (
            <AdminLink key={link.href} href={link.href} pathname={pathname} tone="header">
              {link.label}
            </AdminLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <Link
            href="/"
            className="hidden min-h-11 items-center font-label text-sm tracking-wide text-sand md:inline-flex"
          >
            Ver tienda
          </Link>
          <form action={logoutAdmin} className="hidden md:block">
            <button type="submit" className="inline-flex min-h-11 items-center font-label text-sm tracking-wide text-paper">
              Salir
            </button>
          </form>
          <AdminMenu pathname={pathname} />
        </div>
      </div>
    </header>
  );
}

function AdminLink({
  href,
  pathname,
  children,
  tone,
}: {
  href: string;
  pathname: string;
  children: string;
  tone: "header" | "menu";
}) {
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center font-label tracking-wide",
        tone === "menu" ? "px-3 text-base text-foreground" : "text-sm",
        active
          ? "underline decoration-primary decoration-2 underline-offset-8"
          : tone === "header"
            ? "text-sand"
            : undefined,
        active && tone === "header" ? "text-paper" : undefined,
      )}
    >
      {children}
    </Link>
  );
}

function AdminMenu({ pathname }: { pathname: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
        aria-label="Abrir menú"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>
      <dialog
        ref={dialogRef}
        className="menu-dialog"
        aria-labelledby="admin-menu-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (!clickInside(event)) setOpen(false);
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4">
            <p id="admin-menu-title" className="font-label text-sm tracking-wide">
              Administración
            </p>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Administración" className="flex flex-1 flex-col px-3 py-3">
            {links.map((link) => (
              <AdminLink key={link.href} href={link.href} pathname={pathname} tone="menu">
                {link.label}
              </AdminLink>
            ))}
            <Link href="/" className="mt-4 inline-flex min-h-11 items-center px-3 font-label text-base tracking-wide">
              Ver tienda
            </Link>
            <form action={logoutAdmin} className="mt-2 px-3">
              <button type="submit" className="inline-flex min-h-11 items-center font-label text-base tracking-wide">
                Salir
              </button>
            </form>
          </nav>
        </div>
      </dialog>
    </>
  );
}

function clickInside(event: React.MouseEvent<HTMLDialogElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
