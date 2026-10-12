import "server-only";

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { schema } from "@/db";
import { executor, type DbExecutor } from "./executor";

const { categories, productImages, products } = schema;

export type CatalogImage = {
  url: string;
  alt: string | null;
  sortOrder: number;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  stock: number;
  maxPerOrder: number | null;
  isFeatured: boolean;
  categoryName: string;
  categorySlug: string;
  images: CatalogImage[];
};

export type ProductStock = {
  id: string;
  name: string;
  price: string;
  stock: number;
  maxPerOrder: number | null;
  isActive: boolean;
  deletedAt: Date | null;
};

export type ProductListFilter = {
  categorySlug?: string;
  featuredOnly?: boolean;
};

const productColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  description: products.description,
  price: products.price,
  currency: products.currency,
  stock: products.stock,
  maxPerOrder: products.maxPerOrder,
  isFeatured: products.isFeatured,
  categoryName: categories.name,
  categorySlug: categories.slug,
};

export async function listCategories(db?: DbExecutor) {
  return executor(db)
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listProducts(filter: ProductListFilter = {}, db?: DbExecutor): Promise<CatalogProduct[]> {
  const rows = await executor(db)
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(visibleProduct(filter))
    .orderBy(asc(categories.sortOrder), asc(products.name));

  return withImages(rows, db);
}

export async function findProductBySlug(slug: string, db?: DbExecutor): Promise<CatalogProduct | null> {
  const [row] = await executor(db)
    .select(productColumns)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(visibleProduct(), eq(products.slug, slug)))
    .limit(1);

  if (!row) {
    return null;
  }

  const [product] = await withImages([row], db);
  return product ?? null;
}

export async function listProductsByIds(ids: string[], db?: DbExecutor): Promise<ProductStock[]> {
  if (ids.length === 0) {
    return [];
  }

  return executor(db)
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      stock: products.stock,
      maxPerOrder: products.maxPerOrder,
      isActive: products.isActive,
      deletedAt: products.deletedAt,
    })
    .from(products)
    .where(inArray(products.id, ids));
}

/**
 * Descuenta hasta agotar el stock. Si piden más de lo que hay, el stock queda en 0
 * y el resto del pedido se consigue a pedido. `null` si el producto no existe.
 */
export async function decrementStock(productId: string, quantity: number, db?: DbExecutor) {
  const [row] = await executor(db)
    .update(products)
    .set({ stock: sql`GREATEST(${products.stock} - ${quantity}, 0)` })
    .where(eq(products.id, productId))
    .returning({ id: products.id, stock: products.stock });

  return row ?? null;
}

function visibleProduct(filter: ProductListFilter = {}) {
  return and(
    eq(products.isActive, true),
    isNull(products.deletedAt),
    eq(categories.isActive, true),
    filter.categorySlug ? eq(categories.slug, filter.categorySlug) : undefined,
    filter.featuredOnly ? eq(products.isFeatured, true) : undefined,
  );
}

async function withImages<T extends { id: string }>(rows: T[], db?: DbExecutor): Promise<(T & { images: CatalogImage[] })[]> {
  if (rows.length === 0) {
    return [];
  }

  const images = await executor(db)
    .select({
      productId: productImages.productId,
      url: productImages.url,
      alt: productImages.alt,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(
      inArray(
        productImages.productId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(productImages.sortOrder));

  const byProduct = new Map<string, CatalogImage[]>();
  for (const image of images) {
    const list = byProduct.get(image.productId) ?? [];
    list.push({ url: image.url, alt: image.alt, sortOrder: image.sortOrder });
    byProduct.set(image.productId, list);
  }

  return rows.map((row) => ({ ...row, images: byProduct.get(row.id) ?? [] }));
}
