"use client";

type CartAddedListener = (payload: { productName: string }) => void;

const addedListeners = new Set<CartAddedListener>();

/** Avisa al drawer/toast cuando se agrega un producto (optimistic). */
export function notifyCartAdded(productName: string) {
  for (const listener of addedListeners) listener({ productName });
}

export function onCartAdded(listener: CartAddedListener) {
  addedListeners.add(listener);
  return () => {
    addedListeners.delete(listener);
  };
}
