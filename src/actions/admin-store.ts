"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  deliveriesPausedSchema,
  supplierPurchaseDeleteSchema,
  supplierPurchaseSchema,
  supplierPurchaseUpdateSchema,
} from "@/lib/validations/admin";
import { requireAdmin } from "@/services/admin-auth.service";
import { addSupplierPurchase, editSupplierPurchase, removeSupplierPurchase } from "@/services/investment.service";
import { updateDeliveriesPaused } from "@/services/store-settings.service";

export type PurchaseFormState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<"amount" | "note" | "purchasedOn", string[]>> };

const saveError = "No pudimos guardar la compra.";

export async function setDeliveriesPausedAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = deliveriesPausedSchema.safeParse({ paused: String(formData.get("paused") ?? "") });
  if (!parsed.success) return;
  await updateDeliveriesPaused(parsed.data.paused === "true");
  revalidatePath("/", "layout");
  revalidatePath("/admin");
}

export async function createSupplierPurchaseAction(
  _prev: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  await requireAdmin();
  const parsed = supplierPurchaseSchema.safeParse(readPurchase(formData));
  if (!parsed.success) return invalidPurchase(parsed.error);

  await addSupplierPurchase(parsed.data);
  revalidateInvestment();
  return { status: "saved" };
}

export async function updateSupplierPurchaseAction(
  _prev: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  await requireAdmin();
  const parsed = supplierPurchaseUpdateSchema.safeParse({
    ...readPurchase(formData),
    purchaseId: String(formData.get("purchaseId") ?? ""),
  });
  if (!parsed.success) return invalidPurchase(parsed.error);

  const updated = await editSupplierPurchase(parsed.data.purchaseId, parsed.data);
  if (!updated.ok) return { status: "error", message: updated.message };

  revalidateInvestment();
  return { status: "saved" };
}

export async function deleteSupplierPurchaseAction(
  _prev: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  await requireAdmin();
  const parsed = supplierPurchaseDeleteSchema.safeParse({
    purchaseId: String(formData.get("purchaseId") ?? ""),
  });
  if (!parsed.success) return { status: "error", message: saveError };

  const removed = await removeSupplierPurchase(parsed.data.purchaseId);
  if (!removed.ok) return { status: "error", message: removed.message };

  revalidateInvestment();
  return { status: "saved" };
}

function readPurchase(formData: FormData) {
  return {
    amount: String(formData.get("amount") ?? ""),
    note: String(formData.get("note") ?? ""),
    purchasedOn: String(formData.get("purchasedOn") ?? ""),
  };
}

function invalidPurchase(error: z.ZodError): PurchaseFormState {
  const fieldErrors = z.flattenError(error).fieldErrors as PurchaseFormState extends { fieldErrors?: infer Fields }
    ? Fields
    : never;
  return {
    status: "error",
    message: "Revisá el monto y la fecha.",
    fieldErrors,
  };
}

function revalidateInvestment() {
  revalidatePath("/admin");
  revalidatePath("/admin/inversion");
}
