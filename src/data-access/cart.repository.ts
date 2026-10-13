import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { schema } from "@/db";
import { executor, firstRow, type DbExecutor } from "./executor";

const { cartItems, carts, productImages, products } = schema;

export const cartStatuses = ["active", "converted", "abandoned"] as const;
export type CartStatus = (typeof cartStatuses)[number];

export type CartRecord = {
  id: string;
  status: CartStatus;
  expiresAt: Date;
};

export type CartLine = {
  productId: string;
  name: string;
  slug: string;
  unitPrice: string;
  quantity: number;
  stock: number;
  maxPerOrder: number | null;
  isActive: boolean;
  deletedAt: Date | null;
  imageUrl: string | null;
};

export async function insertCart(expiresAt: Date, db?: DbExecutor): Promise<CartRecord> {
  const row = firstRow(
    await executor(db).insert(carts).values({ expiresAt }).returning({
      id: carts.id,
      status: carts.status,
      expiresAt: carts.expiresAt,
    }),
    "No se pudo crear el carrito",
  );

  return { ...row, status: asCartStatus(row.status) };
}

export async function findCart(id: string, db?: DbExecutor): Promise<CartRecord | null> {
  const [row] = await executor(db)
    .select({ id: carts.id, status: carts.status, expiresAt: carts.expiresAt })
    .from(carts)
    .where(eq(carts.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  return { ...row, status: asCartStatus(row.status) };
}

export async function listCartLines(cartId: string, db?: DbExecutor): Promise<CartLine[]> {
  const lines = await executor(db)
    .select({
      productId: products.id,
      name: products.name,
      slug: products.slug,
      unitPrice: products.price,
      quantity: cartItems.quantity,
      stock: products.stock,
      maxPerOrder: products.maxPerOrder,
      isActive: products.isActive,
      deletedAt: products.deletedAt,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(products.name));

  if (lines.length === 0) {
    return [];
  }

  const images = await executor(db)
    .select({
      productId: productImages.productId,
      url: productImages.url,
    })
    .from(productImages)
    .where(
      inArray(
        productImages.productId,
        lines.map((line) => line.productId),
      ),
    )
    .orderBy(asc(productImages.sortOrder));

  const coverByProduct = new Map<string, string>();
  for (const image of images) {
    if (!coverByProduct.has(image.productId)) {
      coverByProduct.set(image.productId, image.url);
    }
  }

  return lines.map((line) => ({
    ...line,
    imageUrl: coverByProduct.get(line.productId) ?? null,
  }));
}

export async function incrementCartItem(
  cartId: string,
  productId: string,
  by: number,
  db?: DbExecutor,
) {
  return firstRow(
    await executor(db)
      .insert(cartItems)
      .values({ cartId, productId, quantity: by })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.productId],
        set: {
          quantity: sql`${cartItems.quantity} + ${by}`,
          updatedAt: new Date(),
        },
      })
      .returning({ quantity: cartItems.quantity }),
    "No se pudo guardar el ítem del carrito",
  );
}

export async function setCartItemQuantity(
  cartId: string,
  productId: string,
  quantity: number,
  db?: DbExecutor,
) {
  return firstRow(
    await executor(db)
      .insert(cartItems)
      .values({ cartId, productId, quantity })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.productId],
        set: { quantity },
      })
      .returning({ id: cartItems.id, quantity: cartItems.quantity }),
    "No se pudo guardar el ítem del carrito",
  );
}

export async function deleteCartItem(cartId: string, productId: string, db?: DbExecutor) {
  const rows = await executor(db)
    .delete(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
    .returning({ id: cartItems.id });

  return rows.length > 0;
}

export async function setCartStatus(cartId: string, status: CartStatus, db?: DbExecutor) {
  const [row] = await executor(db)
    .update(carts)
    .set({ status })
    .where(eq(carts.id, cartId))
    .returning({ id: carts.id, status: carts.status });

  return row ? { ...row, status: asCartStatus(row.status) } : null;
}

function asCartStatus(value: string): CartStatus {
  if (value === "active" || value === "converted" || value === "abandoned") {
    return value;
  }
  throw new Error(`Estado de carrito desconocido: ${value}`);
}
