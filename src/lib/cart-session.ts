import "server-only";

import { cookies } from "next/headers";
import { emptyCart, type CartLineSnapshot, type CartSnapshot } from "@/lib/cart-types";
import { orderQuantityLimit } from "@/lib/order-limits";
import { createCart, getCart, type CartView } from "@/services/cart.service";

export const CART_COOKIE = "koi_cart";

const WEEK_SECONDS = 60 * 60 * 24 * 7;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function toSnapshot(cart: CartView): CartSnapshot {
  return {
    subtotal: cart.subtotal,
    itemCount: cart.lines.reduce((count, line) => count + line.quantity, 0),
    lines: cart.lines.map(
      (line): CartLineSnapshot => ({
        productId: line.productId,
        name: line.name,
        slug: line.slug,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
        stock: line.stock,
        imageUrl: line.imageUrl,
        problem: line.problem,
        limit: lineLimit(line),
      }),
    ),
  };
}

async function readCartId(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(CART_COOKIE)?.value;
  if (!value || !UUID.test(value)) return null;
  return value;
}

export async function readCartSnapshot(): Promise<CartSnapshot> {
  const cart = await readOpenCart();
  return cart ? toSnapshot(cart) : emptyCart;
}

export async function readOpenCart(): Promise<CartView | null> {
  const id = await readCartId();
  if (!id) return null;
  const cart = await getCart(id);
  return cart.ok ? cart.value : null;
}

export async function ensureOpenCart(): Promise<CartView> {
  const existing = await readOpenCart();
  if (existing) return existing;

  const created = await createCart();
  const jar = await cookies();
  jar.set(CART_COOKIE, created.id, cookieOptions(WEEK_SECONDS));
  return created;
}

export async function clearCartCookie() {
  const jar = await cookies();
  jar.set(CART_COOKIE, "", cookieOptions(0));
}

function lineLimit(line: CartView["lines"][number]): number | null {
  if (line.problem === "unavailable") return null;
  return orderQuantityLimit(line.maxPerOrder);
}
