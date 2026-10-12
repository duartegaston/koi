"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addToCart, type CartActionState } from "@/actions/cart";
import { Button } from "@/components/ui/button";

const idleCartState: CartActionState = { status: "idle" };

export function AddToCart({ productId, disabled }: { productId: string; disabled: boolean }) {
  const [state, action] = useActionState(addToCart, idleCartState);

  return (
    <form action={action} className="mt-8 space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <SubmitButton disabled={disabled} />
      {state.status === "error" ? (
        <p role="alert" className="text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} className="w-full md:w-auto md:min-w-48">
      {disabled ? "Sin stock" : pending ? "Agregando…" : "Agregar al carrito"}
    </Button>
  );
}
