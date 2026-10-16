"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { createManualOrderAction, type ManualOrderState } from "@/actions/admin-orders";
import { Button } from "@/components/ui/button";
import { InputField, SelectField } from "@/components/ui/field";
import { fromCents, formatArs, toCents } from "@/lib/money";

const idle: ManualOrderState = { status: "idle" };
const maxLines = 20;

type ProductOption = {
  id: string;
  name: string;
  price: string;
  stock: number;
  isActive: boolean;
};

export function ManualOrderForm({ products }: { products: ProductOption[] }) {
  const [state, action, pending] = useActionState(createManualOrderAction, idle);
  const [rows, setRows] = useState<string[]>(["line-1"]);
  const nextKey = useRef(2);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const hasFieldError = Boolean(errors?.customerName || errors?.customerPhone || errors?.paymentMethod || errors?.lines);
  const total = useMemo(() => previewTotal(products, rows, selected, quantities), [products, rows, selected, quantities]);

  function addRow() {
    const key = `line-${nextKey.current}`;
    nextKey.current += 1;
    setRows((current) => (current.length >= maxLines ? current : [...current, key]));
  }

  function removeRow(key: string) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row !== key)));
  }

  return (
    <form action={action} className="grid max-w-xl gap-6">
      <InputField label="Nombre" name="customerName" autoComplete="name" required maxLength={120} errors={errors?.customerName} />
      <InputField
        label="Teléfono"
        name="customerPhone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        maxLength={20}
        errors={errors?.customerPhone}
      />
      <SelectField label="Pago" name="paymentMethod" defaultValue="transfer" errors={errors?.paymentMethod}>
        <option value="transfer">Transferencia</option>
        <option value="cash">Efectivo</option>
      </SelectField>

      <fieldset className="grid gap-4">
        <legend className="font-label text-sm font-medium">Productos</legend>
        {errors?.lines?.[0] ? (
          <p role="alert" className="text-sm">
            {errors.lines[0]}
          </p>
        ) : null}
        {rows.map((key, index) => (
          <OrderLine
            key={key}
            index={index}
            products={products}
            selectedId={selected[key] ?? ""}
            quantity={quantities[key] ?? "1"}
            takenIds={takenExcept(rows, selected, key)}
            canRemove={rows.length > 1}
            onProduct={(productId) => setSelected((current) => ({ ...current, [key]: productId }))}
            onQuantity={(quantity) => setQuantities((current) => ({ ...current, [key]: quantity }))}
            onRemove={() => removeRow(key)}
          />
        ))}
        {rows.length < maxLines ? (
          <button type="button" className="min-h-11 w-fit text-sm underline underline-offset-4" onClick={addRow}>
            Agregar producto
          </button>
        ) : null}
      </fieldset>

      <p className="text-sm">
        Total <span className="font-medium">{formatArs(total)}</span>
        <span className="mt-1 block text-muted">Retiro en el local. El envío no se cobra.</span>
      </p>

      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="delivered" className="size-4 accent-primary" />
        Ya está entregado
      </label>

      {state.status === "error" && !hasFieldError ? (
        <p role="alert" className="border border-line bg-surface px-4 py-3 text-sm">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Guardando" : "Cargar y descontar stock"}
      </Button>
    </form>
  );
}

function OrderLine({
  index,
  products,
  selectedId,
  quantity,
  takenIds,
  canRemove,
  onProduct,
  onQuantity,
  onRemove,
}: {
  index: number;
  products: ProductOption[];
  selectedId: string;
  quantity: string;
  takenIds: Set<string>;
  canRemove: boolean;
  onProduct: (productId: string) => void;
  onQuantity: (quantity: string) => void;
  onRemove: () => void;
}) {
  const productId = `manual-product-${index}`;
  const quantityId = `manual-quantity-${index}`;

  return (
    <div className="grid gap-3 border border-line bg-surface p-4 sm:grid-cols-[1fr_6rem]">
      <label className="min-w-0 space-y-1.5">
        <span className="block font-label text-sm font-medium">Producto {index + 1}</span>
        <select
          id={productId}
          name="productId"
          required
          value={selectedId}
          onChange={(event) => onProduct(event.target.value)}
          className="h-11 w-full border border-line bg-background px-3"
        >
          <option value="">Elegí un producto</option>
          {products.map((product) => (
            <option key={product.id} value={product.id} disabled={takenIds.has(product.id)}>
              {product.name} · {formatArs(product.price)} · stock {product.stock}
              {product.isActive ? "" : " · oculto"}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="block font-label text-sm font-medium">Cantidad</span>
        <input
          id={quantityId}
          name="quantity"
          type="number"
          min={1}
          max={99}
          required
          value={quantity}
          onChange={(event) => onQuantity(event.target.value)}
          className="h-11 w-full border border-line bg-background px-3"
        />
      </label>
      {canRemove ? (
        <button type="button" className="min-h-11 w-fit text-sm underline underline-offset-4" onClick={onRemove}>
          Quitar
        </button>
      ) : null}
    </div>
  );
}

function takenExcept(rows: string[], selected: Record<string, string>, current: string): Set<string> {
  const taken = new Set<string>();
  for (const row of rows) {
    if (row === current) continue;
    const productId = selected[row];
    if (productId) taken.add(productId);
  }
  return taken;
}

function previewTotal(
  products: ProductOption[],
  rows: string[],
  selected: Record<string, string>,
  quantities: Record<string, string>,
): string {
  const byId = new Map(products.map((product) => [product.id, product]));
  let cents = 0;
  for (const row of rows) {
    const product = byId.get(selected[row] ?? "");
    const quantity = Number(quantities[row] ?? "1");
    if (!product || !Number.isInteger(quantity) || quantity < 1) continue;
    cents += toCents(product.price) * quantity;
  }
  return fromCents(cents);
}
