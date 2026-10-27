"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { manualOrderSchema } from "@/lib/validations/admin";
import { requireAdmin } from "@/services/admin-auth.service";
import {
  approveCashOrder,
  approveTransferOrder,
  cancelOrder,
  confirmMercadoPagoOrder,
  fulfillOrder,
  recordManualPickupOrder,
} from "@/services/order.service";

export type OrderActionState = { status: "idle" } | { status: "error"; message: string } | { status: "success"; message: string };

export type ManualOrderState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<"customerName" | "customerPhone" | "paymentMethod" | "lines", string[]>>;
    };

const intents = {
  approve: approveTransferOrder,
  approve_cash: approveCashOrder,
  confirm: confirmMercadoPagoOrder,
  fulfill: fulfillOrder,
} as const;

export async function updateOrderAction(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  await requireAdmin();
  const intent = String(formData.get("intent") ?? "");
  const publicCode = String(formData.get("publicCode") ?? "");
  if (!z.string().regex(/^KOI-[A-F0-9]{8}$/).safeParse(publicCode).success) {
    return { status: "error", message: "No encontramos ese pedido." };
  }

  if (intent === "cancel") {
    const result = await cancelOrder(publicCode);
    if (!result.ok) return { status: "error", message: result.message };
    revalidateOrderViews(publicCode);
    return {
      status: "success",
      message: result.value.restoredStock
        ? "Pedido cancelado. Se restauró el stock descontado."
        : "Pedido cancelado.",
    };
  }

  if (intent !== "approve" && intent !== "approve_cash" && intent !== "confirm" && intent !== "fulfill") {
    return { status: "error", message: "Esa acción no está disponible." };
  }

  const result = await intents[intent](publicCode);
  if (!result.ok) return { status: "error", message: result.message };

  revalidateOrderViews(publicCode);
  return { status: "success", message: successMessage(intent) };
}

function revalidateOrderViews(publicCode: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${publicCode}`);
  revalidatePath("/admin/stock");
  revalidatePath("/admin/inversion");
  revalidatePath("/admin/mas-vendidos");
  revalidatePath("/", "layout");
}

export async function createManualOrderAction(
  _prev: ManualOrderState,
  formData: FormData,
): Promise<ManualOrderState> {
  await requireAdmin();
  const parsed = manualOrderSchema.safeParse(readManualOrder(formData));
  if (!parsed.success) return invalidManualOrder(parsed.error);

  const result = await recordManualPickupOrder(parsed.data);
  if (!result.ok) return { status: "error", message: result.message };

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/stock");
  revalidatePath("/admin/inversion");
  revalidatePath("/admin/mas-vendidos");
  redirect(`/admin/pedidos/${result.value.publicCode}`);
}

function readManualOrder(formData: FormData) {
  const productIds = formData.getAll("productId");
  const quantities = formData.getAll("quantity");
  return {
    customerName: String(formData.get("customerName") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    delivered: formData.get("delivered") === "on",
    lines: productIds.map((productId, index) => ({
      productId: String(productId),
      quantity: String(quantities[index] ?? ""),
    })),
  };
}

function invalidManualOrder(error: z.ZodError): ManualOrderState {
  const fieldErrors: NonNullable<Extract<ManualOrderState, { status: "error" }>["fieldErrors"]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === "customerName" || key === "customerPhone" || key === "paymentMethod" || key === "lines") {
      const current = fieldErrors[key] ?? [];
      if (!current.includes(issue.message)) current.push(issue.message);
      fieldErrors[key] = current;
    }
  }
  return {
    status: "error",
    message: fieldErrors.lines?.[0] ?? "Revisá los datos del pedido.",
    fieldErrors,
  };
}

function successMessage(intent: keyof typeof intents): string {
  if (intent === "approve" || intent === "approve_cash" || intent === "confirm") {
    return "Pedido aprobado. Se descontó el stock disponible. Lo que falta queda a pedido.";
  }
  return "Pedido marcado como entregado.";
}
