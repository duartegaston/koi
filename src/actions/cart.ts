"use server";

import { addQuantity, changeQuantity } from "@/services/cart.service";
import { ensureOpenCartId, readOpenCartId } from "@/lib/cart-session";
import { addToCartSchema, setQuantitySchema } from "@/lib/validations/cart";

export type CartActionState = { status: "idle" } | { status: "success" } | { status: "error"; message: string };

export async function addToCart(formData: FormData): Promise<CartActionState> {
  const parsed = addToCartSchema.safeParse({
    productId: String(formData.get("productId") ?? ""),
    quantity: String(formData.get("quantity") ?? "1"),
  });
  if (!parsed.success) {
    return { status: "error", message: "No pudimos agregar ese producto." };
  }

  const cartId = await ensureOpenCartId();
  const updated = await addQuantity(cartId, parsed.data.productId, parsed.data.quantity);
  if (!updated.ok) {
    return { status: "error", message: updated.message };
  }

  return { status: "success" };
}

export async function setCartQuantity(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const parsed = setQuantitySchema.safeParse({
    productId: String(formData.get("productId") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", message: "No pudimos actualizar la cantidad." };
  }

  const cartId = await readOpenCartId();
  if (!cartId) {
    return { status: "error", message: "El carrito no está disponible. Volvé a agregar el producto." };
  }

  const updated = await changeQuantity(cartId, parsed.data.productId, parsed.data.quantity);
  if (!updated.ok) {
    return { status: "error", message: updated.message };
  }

  return { status: "success" };
}
