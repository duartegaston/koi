import "server-only";

import { sumRecoveredProductSubtotal } from "@/data-access/admin-order.repository";
import {
  deleteSupplierPurchase,
  insertSupplierPurchase,
  listSupplierPurchases,
  updateSupplierPurchase,
  type SupplierPurchaseRow,
} from "@/data-access/supplier-purchase.repository";
import { addAmounts, fromCents, toCents } from "@/lib/money";
import { fail, type ServiceResult } from "./result";

export type InvestmentSummary = {
  purchases: SupplierPurchaseRow[];
  invested: string;
  recovered: string;
  balance: string;
};

export async function getInvestmentSummary(): Promise<InvestmentSummary> {
  const [purchases, recoveredRaw] = await Promise.all([listSupplierPurchases(), sumRecoveredProductSubtotal()]);
  const invested = purchases.reduce((sum, row) => addAmounts(sum, row.amount), "0.00");
  const recovered = normalizeMoney(recoveredRaw);
  const balance = fromCents(toCents(recovered) - toCents(invested));
  return { purchases, invested, recovered, balance };
}

export async function addSupplierPurchase(input: {
  amount: string;
  note: string | null;
  purchasedOn: string;
}): Promise<ServiceResult<SupplierPurchaseRow>> {
  const row = await insertSupplierPurchase(input);
  return { ok: true, value: row };
}

export async function editSupplierPurchase(
  id: string,
  input: { amount: string; note: string | null; purchasedOn: string },
): Promise<ServiceResult<SupplierPurchaseRow>> {
  const row = await updateSupplierPurchase(id, input);
  if (!row) return fail("not_found", "Esa compra ya no está.");
  return { ok: true, value: row };
}

export async function removeSupplierPurchase(id: string): Promise<ServiceResult<true>> {
  const removed = await deleteSupplierPurchase(id);
  if (!removed) return fail("not_found", "Esa compra ya no está.");
  return { ok: true, value: true };
}

function normalizeMoney(value: string): string {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return "0.00";
  const fraction = (match[2] ?? "").slice(0, 2).padEnd(2, "0");
  return `${match[1]}.${fraction}`;
}
