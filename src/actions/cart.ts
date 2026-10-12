"use server";

import { revalidatePath } from "next/cache";
import { changeQuantity } from "@/services/cart.service";
import { ensureOpenCart, readOpenCart } from "@/lib/cart-session";
import { addToCartSchema, setQuantitySchema } from "@/lib/validations/cart";

export type CartActionState = { status: "idle" } | { status: "success" } | { status: "error"; message: string };

export async function addToCart(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const parsed = addToCartSchema.safeParse({
    productId: String(formData.get("productId") ?? ""),
    quantity: String(formData.get("quantity") ?? "1"),
  });
  if (!parsed.success) {
    return { status: "error", message: "No pudimos agregar ese producto." };
  }

  const cart = await ensureOpenCart();
  const current = cart.lines.find((line) => line.productId === parsed.data.productId);
  const updated = await changeQuantity(cart.id, parsed.data.productId, (current?.quantity ?? 0) + parsed.data.quantity);
  if (!updated.ok) {
    return { status: "error", message: updated.message };
  }

  revalidatePath("/", "layout");
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

  const cart = await readOpenCart();
  if (!cart) {
    return { status: "error", message: "El carrito no está disponible. Volvé a agregar el producto." };
  }

  const updated = await changeQuantity(cart.id, parsed.data.productId, parsed.data.quantity);
  if (!updated.ok) {
    return { status: "error", message: updated.message };
  }

  revalidatePath("/", "layout");
  return { status: "success" };
}
