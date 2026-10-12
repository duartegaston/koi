import "server-only";

import { and, asc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { schema } from "@/db";
import { executor, firstRow, type DbExecutor } from "./executor";

const { categories, productImages, products } = schema;

export type AdminImage = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  objectKey: string | null;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  maxPerOrder: number | null;
  isFeatured: boolean;
  isActive: boolean;
  categoryId: string;
  categoryName: string;
  images: AdminImage[];
};

export type AdminCategory = {
  id: string;
  name: string;
};

const productColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  description: products.description,
  price: products.price,
  stock: products.stock,
  maxPerOrder: products.maxPerOrder,
  isFeatured: products.isFeatured,
  isActive: products.isActive,
  categoryId: products.categoryId,
  categoryName: categories.name,
};

export async function listAdminCategories(db?: DbExecutor): Promise<AdminCategory[]> {
  return executor(db)
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listAdminProducts(db?: DbExecutor): Promise<AdminProduct[]> {
  const rows = await executor(db)
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(isNull(products.deletedAt))
    .orderBy(asc(products.name));
  return withImages(rows, db);
}

export async function listStockProducts(db?: DbExecutor) {
  return executor(db)
    .select({
      id: products.id,
      name: products.name,
      stock: products.stock,
      isActive: products.isActive,
    })
    .from(products)
    .where(isNull(products.deletedAt))
    .orderBy(asc(products.stock), asc(products.name));
}

export async function listLowStockProducts(threshold: number, limit: number, db?: DbExecutor) {
  return executor(db)
    .select({ id: products.id, name: products.name, stock: products.stock })
    .from(products)
    .where(and(isNull(products.deletedAt), eq(products.isActive, true), lte(products.stock, threshold)))
    .orderBy(asc(products.stock), asc(products.name))
    .limit(limit);
}

export async function findAdminProduct(id: string, db?: DbExecutor): Promise<AdminProduct | null> {
  const [row] = await executor(db)
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .limit(1);
  if (!row) return null;
  const [product] = await withImages([row], db);
  return product ?? null;
}

export async function categoryExists(id: string, db?: DbExecutor): Promise<boolean> {
  const [row] = await executor(db).select({ id: categories.id }).from(categories).where(eq(categories.id, id)).limit(1);
  return Boolean(row);
}

export async function insertAdminProduct(
  input: {
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    price: string;
    stock: number;
    maxPerOrder: number | null;
    isFeatured: boolean;
    isActive: boolean;
  },
  db?: DbExecutor,
) {
  return firstRow(
    await executor(db)
      .insert(products)
      .values(input)
      .returning({ id: products.id }),
    "No se pudo crear el producto",
  );
}

export async function updateAdminProduct(
  id: string,
  input: {
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    price: string;
    stock: number;
    maxPerOrder: number | null;
    isFeatured: boolean;
    isActive: boolean;
  },
  db?: DbExecutor,
) {
  const [row] = await executor(db)
    .update(products)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .returning({ id: products.id });
  return row ?? null;
}

export async function softDeleteProduct(id: string, db?: DbExecutor) {
  const [row] = await executor(db)
    .update(products)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .returning({ id: products.id });
  return row ?? null;
}

export async function setProductStock(id: string, stock: number, db?: DbExecutor) {
  const [row] = await executor(db)
    .update(products)
    .set({ stock, updatedAt: new Date() })
    .where(and(eq(products.id, id), isNull(products.deletedAt), gte(products.stock, 0)))
    .returning({ id: products.id, stock: products.stock });
  return row ?? null;
}

export async function insertAdminImages(
  productId: string,
  images: Array<{ url: string; alt: string; sortOrder: number; objectKey: string }>,
  db?: DbExecutor,
) {
  if (images.length === 0) return [];
  return executor(db)
    .insert(productImages)
    .values(images.map((image) => ({ productId, ...image })))
    .returning({ id: productImages.id, objectKey: productImages.objectKey });
}

export async function deleteAdminImages(productId: string, imageIds: string[], db?: DbExecutor) {
  if (imageIds.length === 0) return [];
  return executor(db)
    .delete(productImages)
    .where(and(eq(productImages.productId, productId), inArray(productImages.id, imageIds)))
    .returning({ id: productImages.id, objectKey: productImages.objectKey });
}

async function withImages<T extends { id: string }>(rows: T[], db?: DbExecutor): Promise<(T & { images: AdminImage[] })[]> {
  if (rows.length === 0) return [];

  const images = await executor(db)
    .select({
      id: productImages.id,
      productId: productImages.productId,
      url: productImages.url,
      alt: productImages.alt,
      sortOrder: productImages.sortOrder,
      objectKey: productImages.objectKey,
    })
    .from(productImages)
    .where(
      inArray(
        productImages.productId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(productImages.sortOrder));

  const byProduct = new Map<string, AdminImage[]>();
  for (const image of images) {
    const list = byProduct.get(image.productId) ?? [];
    list.push({
      id: image.id,
      url: image.url,
      alt: image.alt,
      sortOrder: image.sortOrder,
      objectKey: image.objectKey,
    });
    byProduct.set(image.productId, list);
  }

  return rows.map((row) => ({ ...row, images: byProduct.get(row.id) ?? [] }));
}
