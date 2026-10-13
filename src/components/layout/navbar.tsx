import { Suspense } from "react";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { CategoryMenu } from "@/components/layout/category-menu";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Wordmark } from "@/components/layout/wordmark";
import { getCategories } from "@/lib/catalog";
import { readCartSnapshot } from "@/lib/cart-session";
import { storeContactWhatsAppUrl } from "@/lib/whatsapp/link";

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
  const contactHref = storeContactWhatsAppUrl();

  return (
    <div className="flex min-h-20 items-center gap-3 px-4 py-2 md:gap-4 md:px-8">
      <Wordmark onInk withTagline taglineBelow priority />
      <div className="hidden flex-1 justify-center md:flex">
        <CategoryMenu categories={links} />
      </div>
      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <ContactLink href={contactHref} />
        <CartDrawer cart={cart} />
        <MobileMenu categories={links} contactHref={contactHref} />
      </div>
    </div>
  );
}

function ContactLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center rounded-full bg-paper px-4 font-label text-sm font-medium text-ink"
    >
      Contacto
    </a>
  );
}

function NavbarFallback() {
  return (
    <div className="flex min-h-20 items-center px-4 py-2 md:px-8">
      <Wordmark onInk priority />
      <div className="ml-auto h-11 w-11 rounded-full bg-paper/20" />
    </div>
  );
}
