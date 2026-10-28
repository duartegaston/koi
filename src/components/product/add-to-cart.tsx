"use client";

import { useRef, useState } from "react";
import { addToCart } from "@/actions/cart";
import { notifyCartAdded } from "@/components/layout/cart-feedback";
import {
  beginCartWrite,
  endCartWrite,
  publishCart,
  readCart,
  rollbackCart,
  withAddedProduct,
} from "@/components/layout/cart-store";
import { Button } from "@/components/ui/button";
import { availabilityNote, orderQuantityLimit } from "@/lib/order-limits";

export function AddToCart({
  productId,
  name,
  slug,
  price,
  imageUrl,
  stock,
  maxPerOrder,
}: {
  productId: string;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
  stock: number;
  maxPerOrder: number | null;
}) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  const limit = orderQuantityLimit(maxPerOrder);
  const note = availabilityNote(quantity, stock);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const already = readCart().lines.find((line) => line.productId === productId)?.quantity ?? 0;
    const next = already + quantity;
    if (next > limit) {
      setError(`Solo podés pedir ${limit} de ${name}.`);
      return;
    }

    setError(null);
    sending.current = true;
    const previous = readCart();
    beginCartWrite();
    const writtenAt = publishCart(
      withAddedProduct(previous, { id: productId, name, slug, price, stock, imageUrl, limit }, quantity),
    );
    notifyCartAdded(name);

    const data = new FormData(event.currentTarget);
    try {
      const result = await addToCart(data);
      if (result.status === "error") {
        rollbackCart(writtenAt, previous);
        setError(result.message);
      }
    } finally {
      endCartWrite();
      sending.current = false;
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value={String(quantity)} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Quitar uno"
          disabled={quantity <= 1}
          onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          className="inline-flex h-11 w-11 items-center justify-center border border-line text-lg disabled:opacity-40"
        >
          −
        </button>
        <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite" aria-label={`Cantidad: ${quantity}`}>
          {quantity}
        </span>
        <button
          type="button"
          aria-label="Agregar uno"
          disabled={quantity >= limit}
          onClick={() => setQuantity((current) => Math.min(limit, current + 1))}
          className="inline-flex h-11 w-11 items-center justify-center border border-line text-lg disabled:opacity-40"
        >
          +
        </button>
      </div>
      {note ? (
        <p role="status" className="border border-line px-4 py-3 text-sm">
          {note}
        </p>
      ) : null}
      <Button type="submit" className="w-full md:w-auto md:min-w-48">
        Agregar al carrito
      </Button>
      {error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
