"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { addToCart, type CartActionState } from "@/actions/cart";
import { Button } from "@/components/ui/button";
import { availabilityNote, orderQuantityLimit } from "@/lib/order-limits";

const idleCartState: CartActionState = { status: "idle" };

export function AddToCart({
  productId,
  stock,
  maxPerOrder,
}: {
  productId: string;
  stock: number;
  maxPerOrder: number | null;
}) {
  const [state, action] = useActionState(addToCart, idleCartState);
  const [quantity, setQuantity] = useState(1);
  const limit = orderQuantityLimit(maxPerOrder);
  const note = availabilityNote(quantity, stock);

  return (
    <form action={action} className="mt-8 space-y-3">
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
      <SubmitButton />
      {state.status === "error" ? (
        <p role="alert" className="text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto md:min-w-48">
      {pending ? "Agregando…" : "Agregar al carrito"}
    </Button>
  );
}
