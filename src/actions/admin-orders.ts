"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/services/admin-auth.service";
import { approveTransferOrder, cancelOrder, confirmMercadoPagoOrder, fulfillOrder } from "@/services/order.service";

export type OrderActionState = { status: "idle" } | { status: "error"; message: string } | { status: "success"; message: string };

const intents = {
  approve: approveTransferOrder,
  confirm: confirmMercadoPagoOrder,
  cancel: cancelOrder,
  fulfill: fulfillOrder,
} as const;

export async function updateOrderAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  await requireAdmin();
  const intent = String(formData.get("intent") ?? "");
  const publicCode = String(formData.get("publicCode") ?? "");
  if (!z.string().regex(/^KOI-[A-F0-9]{8}$/).safeParse(publicCode).success) {
    return { status: "error", message: "No encontramos ese pedido." };
  }
  if (intent !== "approve" && intent !== "confirm" && intent !== "cancel" && intent !== "fulfill") {
    return { status: "error", message: "Esa acción no está disponible." };
  }

  const result = await intents[intent](publicCode);
  if (!result.ok) return { status: "error", message: result.message };

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath("/", "layout");
  return { status: "success", message: successMessage(intent) };
}

function successMessage(intent: keyof typeof intents): string {
  if (intent === "approve" || intent === "confirm") return "Pedido aprobado. El stock ya se descontó.";
  if (intent === "cancel") return "Pedido cancelado.";
  return "Pedido marcado como entregado.";
}
