import "server-only";

import { getDashboardNumbers, listRecentOrders } from "@/data-access/admin-order.repository";
import { listLowStockProducts } from "@/data-access/admin-product.repository";
import type { AdminPeriod } from "@/lib/admin-period";
import { lowStockThreshold } from "@/lib/stock";

export async function getAdminDashboard(period: AdminPeriod) {
  const [numbers, lowStock, recent] = await Promise.all([
    getDashboardNumbers({ fromDate: period.fromDate, toDate: period.toDate }),
    listLowStockProducts(lowStockThreshold, 8),
    listRecentOrders(8),
  ]);

  return {
    pendingTransfers: Number(numbers.pendingTransfers),
    collected: normalizeMoney(String(numbers.collected)),
    orderCount: Number(numbers.orderCount),
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
