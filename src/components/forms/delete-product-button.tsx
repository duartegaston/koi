"use client";

import { useActionState } from "react";
import { deleteProductAction, type ProductFormState } from "@/actions/admin-products";
import { Button } from "@/components/ui/button";

const initialState: ProductFormState = { status: "idle" };

export function DeleteProductButton({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(deleteProductAction, initialState);

  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "El producto deja de verse en la tienda. Los pedidos anteriores conservan el nombre.",
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      {state.status === "error" ? (
        <p role="alert" className="text-sm">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Eliminando" : "Eliminar"}
      </Button>
    </form>
  );
}
