"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type CategoryLink = { name: string; slug: string };

export function MobileMenu({ categories, contactHref }: { categories: CategoryLink[]; contactHref: string }) {
  const pathname = usePathname();
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
        tabIndex={-1}
        className="menu-dialog"
        aria-labelledby="menu-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (!clickInside(event)) setOpen(false);
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4">
            <p id="menu-title" className="font-label text-sm tracking-wide">
              Menú
            </p>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>
          <nav className="flex flex-col px-3 py-3">
            <p className="px-3 pt-2 pb-1 font-label text-xs tracking-[0.14em] text-muted uppercase">Productos</p>
            <Link
              href="/tienda"
              aria-current={pathname === "/tienda" ? "page" : undefined}
              className="rounded-lg px-3 py-2.5 font-label text-base tracking-wide hover:bg-surface aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-4"
            >
              Todos los productos
            </Link>
            {categories.map((category) => {
              const href = `/categoria/${category.slug}`;
              const active = pathname === href;
              return (
                <Link
                  key={category.slug}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="rounded-lg px-3 py-2.5 font-label text-base tracking-wide hover:bg-surface aria-[current=page]:underline aria-[current=page]:decoration-primary aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-4"
                >
                  {category.name}
                </Link>
              );
            })}
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 rounded-full bg-ink px-4 py-3 text-center font-label text-sm tracking-wide text-paper"
            >
              Contacto
            </a>
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
