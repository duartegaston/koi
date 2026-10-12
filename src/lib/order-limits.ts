/** Tope cuando el producto no tiene máximo propio. El excedente de stock se pide. */
export const DEFAULT_ORDER_CAP = 99;

export const MADE_TO_ORDER_NOTE = "Los pedidos sin stock llegan entre 7 y 10 días hábiles.";

export function orderQuantityLimit(maxPerOrder: number | null): number {
  return maxPerOrder ?? DEFAULT_ORDER_CAP;
}

export function madeToOrderUnits(quantity: number, stock: number): number {
  return Math.max(0, quantity - Math.max(stock, 0));
}

export function availabilityNote(quantity: number, stock: number): string | null {
  const available = Math.max(stock, 0);
  if (madeToOrderUnits(quantity, available) <= 0) return null;
  if (available === 0) return `Sin stock. ${MADE_TO_ORDER_NOTE}`;
  const units = available === 1 ? "1 unidad" : `${available} unidades`;
  return `Solo hay ${units} en stock. ${MADE_TO_ORDER_NOTE}`;
}
