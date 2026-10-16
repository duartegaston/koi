"use client";

import { useActionState } from "react";
import {
  createSupplierPurchaseAction,
  deleteSupplierPurchaseAction,
  updateSupplierPurchaseAction,
  type PurchaseFormState,
} from "@/actions/admin-store";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/field";
import { formatArs } from "@/lib/money";

const idle: PurchaseFormState = { status: "idle" };

export function PurchaseCreateForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState(createSupplierPurchaseAction, idle);

  return (
    <form action={action} className="grid gap-4 border border-line bg-surface p-5">
      <h2 className="font-display text-2xl">Cargar compra</h2>
      <PurchaseFields idPrefix="new" defaultDate={defaultDate} errors={state.status === "error" ? state.fieldErrors : undefined} />
      {state.status === "error" ? (
        <p role="alert" className="text-sm">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Guardando" : "Agregar"}
      </Button>
    </form>
  );
}

export function PurchaseEditForm({
  purchase,
}: {
  purchase: { id: string; amount: string; note: string | null; purchasedOn: string };
}) {
  const [state, action, pending] = useActionState(updateSupplierPurchaseAction, idle);
  const [removeState, remove, removing] = useActionState(deleteSupplierPurchaseAction, idle);

  return (
    <li className="py-6">
      <form action={action} className="grid gap-4">
        <input type="hidden" name="purchaseId" value={purchase.id} />
        <PurchaseFields
          idPrefix={purchase.id}
          defaultDate={purchase.purchasedOn}
          defaultAmount={purchase.amount}
          defaultNote={purchase.note ?? ""}
          errors={state.status === "error" ? state.fieldErrors : undefined}
        />
        {state.status === "error" ? (
          <p role="alert" className="text-sm">
            {state.message}
          </p>
        ) : null}
        {state.status === "saved" ? (
          <p role="status" className="text-sm text-muted">
            Compra actualizada.
          </p>
        ) : null}
        <Button type="submit" variant="secondary" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Guardando" : "Guardar"}
        </Button>
      </form>
      <form
        action={remove}
        className="mt-3"
        onSubmit={(event) => {
          if (!window.confirm(`¿Quitar ${formatArs(purchase.amount)} de la inversión?`)) event.preventDefault();
        }}
      >
        <input type="hidden" name="purchaseId" value={purchase.id} />
        <button type="submit" className="min-h-11 text-sm underline underline-offset-4" disabled={removing}>
          {removing ? "Quitando" : "Quitar"}
        </button>
        {removeState.status === "error" ? (
          <p role="alert" className="mt-2 text-sm">
            {removeState.message}
          </p>
        ) : null}
      </form>
    </li>
  );
}

function PurchaseFields({
  idPrefix,
  defaultDate,
  defaultAmount = "",
  defaultNote = "",
  errors,
}: {
  idPrefix: string;
  defaultDate: string;
  defaultAmount?: string;
  defaultNote?: string;
  errors?: Partial<Record<"amount" | "note" | "purchasedOn", string[]>>;
}) {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="min-w-0 space-y-1.5">
        <span className="block font-label text-sm font-medium">Fecha</span>
        <input
          id={`${idPrefix}-date`}
          name="purchasedOn"
          type="date"
          required
          defaultValue={defaultDate}
          aria-invalid={errors?.purchasedOn?.length ? true : undefined}
          aria-describedby={errors?.purchasedOn?.length ? `${idPrefix}-date-error` : undefined}
          className="h-11 w-full min-w-0 border border-line bg-background px-3"
        />
        {errors?.purchasedOn?.[0] ? (
          <p id={`${idPrefix}-date-error`} className="text-sm">
            {errors.purchasedOn[0]}
          </p>
        ) : null}
      </label>
      <InputField
        id={`${idPrefix}-amount`}
        label="Monto"
        name="amount"
        inputMode="decimal"
        required
        defaultValue={defaultAmount}
        errors={errors?.amount}
      />
      <div className="sm:col-span-2">
        <InputField
          id={`${idPrefix}-note`}
          label="Nota (opcional)"
          name="note"
          maxLength={160}
          defaultValue={defaultNote}
          errors={errors?.note}
        />
      </div>
    </div>
  );
}
