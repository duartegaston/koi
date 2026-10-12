"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type CategoryLink = { name: string; slug: string };

export function CategoryMenu({ categories }: { categories: CategoryLink[] }) {
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const shopActive = pathname === "/tienda";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          "inline-flex min-h-11 items-center gap-2 font-label text-sm tracking-wide",
          shopActive || pathname.startsWith("/categoria/") ? "text-paper" : "text-sand",
        )}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        Categorías
        <Chevron open={open} />
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute top-full left-1/2 z-50 mt-2 w-64 -translate-x-1/2 border border-line bg-paper py-2 text-foreground shadow-lg"
        >
          <li role="none">
            <Link
              role="menuitem"
              href="/tienda"
              aria-current={shopActive ? "page" : undefined}
              className="block px-4 py-3 font-label text-sm tracking-wide hover:bg-surface"
            >
              Todos los productos
            </Link>
          </li>
          {categories.map((category) => {
            const href = `/categoria/${category.slug}`;
            const active = pathname === href;
            return (
              <li key={category.slug} role="none">
                <Link
                  role="menuitem"
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block px-4 py-3 font-label text-sm tracking-wide hover:bg-surface",
                    active && "underline decoration-primary decoration-2 underline-offset-4",
                  )}
                >
                  {category.name}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={cn("transition-transform", open && "rotate-180")}
    >
      <path d="M2 4.5 6 8l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
