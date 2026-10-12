import "server-only";

import { getDashboardNumbers, listRecentOrders } from "@/data-access/admin-order.repository";
import { listLowStockProducts } from "@/data-access/admin-product.repository";
import { lowStockThreshold } from "@/lib/stock";

export async function getAdminDashboard() {
  const [numbers, lowStock, recent] = await Promise.all([
    getDashboardNumbers(),
    listLowStockProducts(lowStockThreshold, 8),
    listRecentOrders(8),
  ]);

  return {
    pendingTransfers: Number(numbers.pendingTransfers),
    collectedToday: normalizeMoney(String(numbers.collectedToday)),
    ordersToday: Number(numbers.ordersToday),
    lowStock,
    recent,
  };
}

function normalizeMoney(value: string): string {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return "0.00";
  const fraction = (match[2] ?? "").slice(0, 2).padEnd(2, "0");
  return `${match[1]}.${fraction}`;
}
