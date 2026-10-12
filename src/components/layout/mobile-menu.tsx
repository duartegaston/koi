"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type CategoryLink = { name: string; slug: string };

export function MobileMenu({ categories }: { categories: CategoryLink[] }) {
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
            <button type="button" className="inline-flex h-11 w-11 items-center justify-center" aria-label="Cerrar menú" onClick={() => setOpen(false)}>
              <CloseIcon />
            </button>
          </div>
          <nav className="flex flex-col px-2 py-4">
            {categories.map((category) => (
              <Link key={category.slug} href={`/categoria/${category.slug}`} className="px-2 py-3 font-display text-3xl">
                {category.name}
              </Link>
            ))}
            <Link href="/contacto" className="px-2 py-3 font-display text-3xl">
              Contacto
            </Link>
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
