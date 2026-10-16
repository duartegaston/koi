import "server-only";

import { desc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { executor, type DbExecutor } from "./executor";

const { supplierPurchases } = schema;

export type SupplierPurchaseRow = {
  id: string;
  amount: string;
  note: string | null;
  purchasedOn: string;
};

export async function listSupplierPurchases(db?: DbExecutor): Promise<SupplierPurchaseRow[]> {
  return executor(db)
    .select({
      id: supplierPurchases.id,
      amount: supplierPurchases.amount,
      note: supplierPurchases.note,
      purchasedOn: supplierPurchases.purchasedOn,
    })
    .from(supplierPurchases)
    .orderBy(desc(supplierPurchases.purchasedOn), desc(supplierPurchases.createdAt));
}

export async function insertSupplierPurchase(
  input: { amount: string; note: string | null; purchasedOn: string },
  db?: DbExecutor,
): Promise<SupplierPurchaseRow> {
  const [row] = await executor(db)
    .insert(supplierPurchases)
    .values(input)
    .returning({
      id: supplierPurchases.id,
      amount: supplierPurchases.amount,
      note: supplierPurchases.note,
      purchasedOn: supplierPurchases.purchasedOn,
    });
  if (!row) throw new Error("No se pudo guardar la compra al proveedor");
  return row;
}

export async function updateSupplierPurchase(
  id: string,
  input: { amount: string; note: string | null; purchasedOn: string },
  db?: DbExecutor,
): Promise<SupplierPurchaseRow | null> {
  const [row] = await executor(db)
    .update(supplierPurchases)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(supplierPurchases.id, id))
    .returning({
      id: supplierPurchases.id,
      amount: supplierPurchases.amount,
      note: supplierPurchases.note,
      purchasedOn: supplierPurchases.purchasedOn,
    });
  return row ?? null;
}

export async function deleteSupplierPurchase(id: string, db?: DbExecutor): Promise<boolean> {
  const rows = await executor(db)
    .delete(supplierPurchases)
    .where(eq(supplierPurchases.id, id))
    .returning({ id: supplierPurchases.id });
  return rows.length > 0;
}
