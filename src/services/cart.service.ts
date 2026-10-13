import "server-only";

import {
  deleteCartItem,
  findCart,
  incrementCartItem,
  insertCart,
  listCartLines,
  setCartItemQuantity,
  type CartLine,
} from "@/data-access/cart.repository";
import { listProductsByIds } from "@/data-access/product.repository";
import { multiplyAmount, addAmounts } from "@/lib/money";
import { madeToOrderUnits, orderQuantityLimit } from "@/lib/order-limits";
import { fail, type ServiceResult } from "./result";

const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CartLineView = {
  productId: string;
  name: string;
  slug: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  stock: number;
  maxPerOrder: number | null;
  madeToOrder: number;
  imageUrl: string | null;
  problem: "unavailable" | "exceeds_limit" | null;
};

export type CartView = {
  id: string;
  expiresAt: Date;
  lines: CartLineView[];
  subtotal: string;
};

export async function createCart(): Promise<CartView> {
  const cart = await insertCart(new Date(Date.now() + CART_TTL_MS));
  return { id: cart.id, expiresAt: cart.expiresAt, lines: [], subtotal: "0.00" };
}

export async function getCart(cartId: string): Promise<ServiceResult<CartView>> {
  const cart = await findCart(cartId);
  const open = openCart(cart);
  if (!open.ok) {
    return open;
  }

  const lines = await listCartLines(cartId);
  return { ok: true, value: toCartView(open.value, lines) };
}

export async function addQuantity(
  cartId: string,
  productId: string,
  quantity: number,
): Promise<ServiceResult<number>> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return fail("quantity_not_allowed", "La cantidad tiene que ser un número entero.");
  }

  const [cart, products] = await Promise.all([requireOpenCart(cartId), listProductsByIds([productId])]);
  if (!cart.ok) return cart;

  const product = products[0];
  if (!product) {
    return fail("product_unavailable", "Ese producto no está disponible.");
  }
  const limit = sellableLimit(product);
  if (limit == null) {
    return fail("product_unavailable", "Ese producto no está disponible.");
  }

  const saved = await incrementCartItem(cartId, productId, quantity);
  if (saved.quantity > limit) {
    const previous = saved.quantity - quantity;
    if (previous <= 0) await deleteCartItem(cartId, productId);
    else await setCartItemQuantity(cartId, productId, previous);
    return fail("quantity_not_allowed", `Solo podés pedir ${limit} de ${product.name}.`);
  }

  return { ok: true, value: saved.quantity };
}

export async function changeQuantity(
  cartId: string,
  productId: string,
  quantity: number,
): Promise<ServiceResult<CartView>> {
  const cart = await requireOpenCart(cartId);
  if (!cart.ok) {
    return cart;
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    return fail("quantity_not_allowed", "La cantidad tiene que ser un número entero.");
  }

  if (quantity === 0) {
    await deleteCartItem(cartId, productId);
    return getCart(cartId);
  }

  const [product] = await listProductsByIds([productId]);
  if (!product) {
    return fail("product_unavailable", "Ese producto no está disponible.");
  }

  const limit = sellableLimit(product);
  if (limit == null) {
    return fail("product_unavailable", "Ese producto no está disponible.");
  }
  if (quantity > limit) {
    return fail("quantity_not_allowed", `Solo podés pedir ${limit} de ${product.name}.`);
  }

  await setCartItemQuantity(cartId, productId, quantity);
  return getCart(cartId);
}

export async function removeItem(cartId: string, productId: string): Promise<ServiceResult<CartView>> {
  const cart = await requireOpenCart(cartId);
  if (!cart.ok) {
    return cart;
  }

  const removed = await deleteCartItem(cartId, productId);
  if (!removed) {
    return fail("line_not_found", "Ese producto no está en el carrito.");
  }

  return getCart(cartId);
}

export async function requireOpenCart(cartId: string): Promise<ServiceResult<{ id: string; expiresAt: Date }>> {
  return openCart(await findCart(cartId));
}

function openCart(
  cart: { id: string; status: string; expiresAt: Date } | null,
): ServiceResult<{ id: string; expiresAt: Date }> {
  if (!cart) {
    return fail("cart_not_found", "No encontramos el carrito.");
  }
  if (cart.status !== "active") {
    return fail("cart_closed", "Ese carrito ya se usó para un pedido.");
  }
  if (cart.expiresAt.getTime() <= Date.now()) {
    return fail("cart_expired", "El carrito venció. Armá uno nuevo.");
  }
  return { ok: true, value: { id: cart.id, expiresAt: cart.expiresAt } };
}

export function toCartView(cart: { id: string; expiresAt: Date }, lines: CartLine[]): CartView {
  const viewLines = lines.map((line) => {
    const limit = sellableLimit(line);
    const problem =
      limit == null ? "unavailable" : line.quantity > limit ? "exceeds_limit" : null;
    return {
      productId: line.productId,
      name: line.name,
      slug: line.slug,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      lineTotal: multiplyAmount(line.unitPrice, line.quantity),
      stock: line.stock,
      maxPerOrder: line.maxPerOrder,
      madeToOrder: madeToOrderUnits(line.quantity, line.stock),
      imageUrl: line.imageUrl,
      problem,
    } satisfies CartLineView;
  });

  return {
    id: cart.id,
    expiresAt: cart.expiresAt,
    lines: viewLines,
    subtotal: viewLines.reduce((sum, line) => addAmounts(sum, line.lineTotal), "0.00"),
  };
}

function sellableLimit(product: {
  maxPerOrder: number | null;
  isActive: boolean;
  deletedAt: Date | null;
}): number | null {
  if (!product.isActive || product.deletedAt) return null;
  return orderQuantityLimit(product.maxPerOrder);
}
