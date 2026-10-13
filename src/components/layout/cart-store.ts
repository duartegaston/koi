"use client";

import { useSyncExternalStore } from "react";
import { emptyCart, type CartLineSnapshot, type CartSnapshot } from "@/lib/cart-types";
import { addAmounts, multiplyAmount } from "@/lib/money";

let current: CartSnapshot | null = null;
let displayed: CartSnapshot | null = null;
let revision = 0;
let writes = 0;
let seenServer = "";
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function cartKey(cart: CartSnapshot) {
  return `${cart.lines.map((line) => `${line.productId}:${line.quantity}`).join("|")}@${cart.subtotal}`;
}

function summarize(lines: CartLineSnapshot[]): CartSnapshot {
  const active = lines.filter((line) => line.quantity > 0);
  return {
    lines,
    itemCount: active.reduce((count, line) => count + line.quantity, 0),
    subtotal: active.reduce((sum, line) => addAmounts(sum, multiplyAmount(line.unitPrice, line.quantity)), "0.00"),
  };
}

export function readCart(): CartSnapshot {
  return displayed ?? current ?? emptyCart;
}

export function rememberDisplayed(cart: CartSnapshot) {
  displayed = cart;
}

export function beginCartWrite() {
  writes += 1;
}

export function endCartWrite() {
  writes -= 1;
}

export function publishCart(cart: CartSnapshot) {
  current = cart;
  displayed = cart;
  revision += 1;
  emit();
  return revision;
}

export function rollbackCart(writtenAt: number, cart: CartSnapshot) {
  if (writtenAt !== revision) return;
  current = cart;
  displayed = cart;
  emit();
}

export function useLiveCart(serverCart: CartSnapshot) {
  const key = cartKey(serverCart);
  if (typeof window !== "undefined") {
    if (current === null) current = serverCart;
    if (seenServer !== "" && seenServer !== key && writes === 0) current = serverCart;
    seenServer = key;
  }

  const cart = useSyncExternalStore(
    subscribe,
    () => current ?? serverCart,
    () => serverCart,
  );
  return cart;
}

export function withLineQuantity(cart: CartSnapshot, productId: string, quantity: number): CartSnapshot {
  const nextQuantity = Math.max(0, quantity);
  const lines =
    nextQuantity === 0
      ? cart.lines.filter((line) => line.productId !== productId)
      : cart.lines.map((line) =>
          line.productId === productId
            ? {
                ...line,
                quantity: nextQuantity,
                lineTotal: multiplyAmount(line.unitPrice, nextQuantity),
              }
            : line,
        );
  return summarize(lines);
}

export function withAddedProduct(
  cart: CartSnapshot,
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    stock: number;
    imageUrl: string | null;
    limit: number | null;
  },
  quantity: number,
): CartSnapshot {
  const existing = cart.lines.find((line) => line.productId === product.id);
  const nextQuantity = (existing && existing.quantity > 0 ? existing.quantity : 0) + quantity;
  const nextLine: CartLineSnapshot = {
    productId: product.id,
    name: existing?.name ?? product.name,
    slug: existing?.slug ?? product.slug,
    unitPrice: existing?.unitPrice ?? product.price,
    quantity: nextQuantity,
    lineTotal: multiplyAmount(existing?.unitPrice ?? product.price, nextQuantity),
    stock: product.stock,
    imageUrl: existing?.imageUrl ?? product.imageUrl,
    problem: null,
    limit: existing?.limit ?? product.limit,
  };
  const lines = existing
    ? cart.lines.map((line) => (line.productId === product.id ? nextLine : line))
    : [...cart.lines, nextLine];
  return summarize(lines);
}
