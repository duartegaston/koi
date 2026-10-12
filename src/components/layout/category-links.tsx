"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type CategoryLink = { name: string; slug: string };

export function CategoryLinks({ categories }: { categories: CategoryLink[] }) {
  const pathname = usePathname();

  if (categories.length === 0) return null;

  return (
    <ul className="hidden items-center gap-6 md:flex">
      {categories.map((category) => {
        const href = `/categoria/${category.slug}`;
        const active = pathname === href;
        return (
          <li key={category.slug}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-xs font-medium uppercase tracking-[0.18em] underline-offset-4 hover:underline",
                active ? "text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              {category.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
