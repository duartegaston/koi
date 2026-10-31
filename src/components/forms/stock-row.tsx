"use client";

import { useActionState, useEffect, useState } from "react";
import { updateStockAction, type StockState } from "@/actions/admin-products";
import { Button } from "@/components/ui/button";
import { formatArs } from "@/lib/money";
import { lowStockThreshold } from "@/lib/stock";

const initialState: StockState = { status: "idle" };

export function StockRow({
  id,
  name,
  price,
  stock,
  isActive,
}: {
  id: string;
  name: string;
  price: string;
  stock: number;
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState(updateStockAction, initialState);
  const current = state.status === "saved" ? state.stock : stock;
  const [value, setValue] = useState(String(current));
  const low = current <= lowStockThreshold;

  useEffect(() => {
    setValue(String(current));
  }, [current]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3 border-b border-line py-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium break-words">{name}</p>
        <p className="text-sm text-muted">{formatArs(price)}</p>
        {!isActive ? <p className="text-sm text-muted">Oculto</p> : null}
        {low ? <p className="text-sm">{current === 0 ? "Sin stock" : "Stock bajo"}</p> : null}
      </div>
      <label>
        <span className="sr-only">Stock de {name}</span>
        <input
          name="stock"
          type="number"
          min={0}
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
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
