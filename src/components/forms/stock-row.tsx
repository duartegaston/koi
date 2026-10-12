"use client";

import { useActionState } from "react";
import { updateStockAction, type StockState } from "@/actions/admin-products";
import { Button } from "@/components/ui/button";

import { lowStockThreshold } from "@/lib/stock";

const initialState: StockState = { status: "idle" };

export function StockRow({ id, name, stock, isActive }: { id: string; name: string; stock: number; isActive: boolean }) {
  const [state, action, pending] = useActionState(updateStockAction, initialState);
  const low = stock <= lowStockThreshold;

  return (
    <form action={action} className="flex flex-wrap items-center gap-3 border-b border-line py-4">
      <div className="min-w-[12rem] flex-1">
        <p className="font-medium">{name}</p>
        {!isActive ? <p className="text-sm text-muted">Oculto</p> : null}
        {low ? <p className="text-sm">{stock === 0 ? "Sin stock" : "Stock bajo"}</p> : null}
      </div>
      <label>
        <span className="sr-only">Stock de {name}</span>
        <input
          name="stock"
          type="number"
          min={0}
          required
          defaultValue={stock}
          className="h-11 w-28 border border-line bg-background px-3 text-sm"
        />
      </label>
      <input type="hidden" name="productId" value={id} />
      <Button type="submit" variant="secondary" className="h-11 px-5" disabled={pending}>
        {pending ? "Guardando" : "Guardar"}
      </Button>
      {state.status === "error" ? (
        <p role="alert" className="w-full text-sm">
          {state.message}
        </p>
      ) : null}
      {state.status === "saved" ? (
        <p role="status" className="w-full text-sm text-muted">
          Stock actualizado.
        </p>
      ) : null}
    </form>
  );
}
