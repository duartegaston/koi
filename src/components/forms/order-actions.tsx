"use client";

import { useActionState } from "react";
import { updateOrderAction, type OrderActionState } from "@/actions/admin-orders";
import { Button } from "@/components/ui/button";

const initialState: OrderActionState = { status: "idle" };

export function OrderActions({
  publicCode,
  canApproveTransfer,
  canApproveCash,
  canConfirmPayment,
  canCancel,
  canFulfill,
}: {
  publicCode: string;
  canApproveTransfer: boolean;
  canApproveCash: boolean;
  canConfirmPayment: boolean;
  canCancel: boolean;
  canFulfill: boolean;
}) {
  const [state, action, pending] = useActionState(updateOrderAction, initialState);
  const hasAction = canApproveTransfer || canApproveCash || canConfirmPayment || canCancel || canFulfill;
  if (!hasAction && state.status === "idle") return null;

  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="publicCode" value={publicCode} />
      {state.status === "error" ? (
        <p role="alert" className="border border-line bg-surface px-4 py-3 text-sm">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p role="status" className="border border-line bg-surface px-4 py-3 text-sm">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {canApproveTransfer ? (
          <Button type="submit" name="intent" value="approve" disabled={pending}>
            Aprobar transferencia
          </Button>
        ) : null}
        {canApproveCash ? (
          <Button type="submit" name="intent" value="approve_cash" disabled={pending}>
            Aprobar efectivo
          </Button>
        ) : null}
        {canConfirmPayment ? (
          <Button type="submit" name="intent" value="confirm" disabled={pending}>
            Confirmar y descontar stock
          </Button>
        ) : null}
        {canFulfill ? (
          <Button type="submit" name="intent" value="fulfill" variant="secondary" disabled={pending}>
            Marcar entregado
          </Button>
        ) : null}
        {canCancel ? (
          <Button type="submit" name="intent" value="cancel" variant="secondary" disabled={pending}>
            Cancelar pedido
          </Button>
        ) : null}
      </div>
    </form>
  );
}
