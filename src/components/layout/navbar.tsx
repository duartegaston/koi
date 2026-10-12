import { Suspense } from "react";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { CategoryLinks } from "@/components/layout/category-links";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Wordmark } from "@/components/layout/wordmark";
import { getCategories } from "@/lib/catalog";
import { readCartSnapshot } from "@/lib/cart-session";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-paper/20 bg-ink text-paper">
      <Suspense fallback={<NavbarFallback />}>
        <NavbarContent />
      </Suspense>
    </header>
  );
}

async function NavbarContent() {
  const [categories, cart] = await Promise.all([getCategories(), readCartSnapshot()]);
  const links = categories.map((category) => ({ name: category.name, slug: category.slug }));

  return (
    <div className="flex h-20 items-center gap-4 px-4 md:px-8">
      <Wordmark onInk withTagline priority />
      <div className="hidden flex-1 justify-center md:flex">
        <CategoryLinks categories={links} />
      </div>
      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <CartDrawer cart={cart} />
        <MobileMenu categories={links} />
      </div>
    </div>
  );
}

function NavbarFallback() {
  return (
    <div className="flex h-20 items-center px-4 md:px-8">
      <Wordmark onInk priority />
      <div className="ml-auto h-11 w-11 rounded-full bg-paper/20" />
    </div>
  );
}
