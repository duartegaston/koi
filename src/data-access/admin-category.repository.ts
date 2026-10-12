import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { schema } from "@/db";
import { executor, firstRow, type DbExecutor } from "./executor";

const { categories, products } = schema;

export type AdminCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

export async function listAdminCategoryRecords(db?: DbExecutor): Promise<AdminCategoryRecord[]> {
  const rows = await executor(db)
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      productCount: sql<string>`count(${products.id})`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id, categories.name, categories.slug, categories.description, categories.sortOrder, categories.isActive)
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return rows.map((row) => ({ ...row, productCount: Number(row.productCount) }));
}

export async function findAdminCategory(id: string, db?: DbExecutor) {
  const [row] = await executor(db)
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return row ?? null;
}

export async function countProductsInCategory(id: string, db?: DbExecutor): Promise<number> {
  const [row] = await executor(db)
    .select({ value: sql<string>`count(*)` })
    .from(products)
    .where(eq(products.categoryId, id));
  return Number(row?.value ?? 0);
}

export async function insertCategory(
  input: { name: string; slug: string; description: string | null; isActive: boolean },
  db?: DbExecutor,
) {
  const sortOrder = await nextSortOrder(db);
  return firstRow(
    await executor(db).insert(categories).values({ ...input, sortOrder }).returning({ id: categories.id }),
    "No se pudo crear la categoría",
  );
}

export async function updateCategory(
  id: string,
  input: { name: string; slug: string; description: string | null; sortOrder: number; isActive: boolean },
  db?: DbExecutor,
) {
  const [row] = await executor(db)
    .update(categories)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return row ?? null;
}

export async function reassignAndDeleteCategory(fromId: string, toId: string, db?: DbExecutor) {
  const rows = await executor(db).execute<{ id: string }>(sql`
    with moved as (
      update products
      set category_id = ${toId}::uuid, updated_at = now()
      where category_id = ${fromId}::uuid
    )
    delete from categories
    where id = ${fromId}::uuid
    returning id
  `);
  return rows[0] ?? null;
}

export async function deleteCategory(id: string, db?: DbExecutor) {
  const [row] = await executor(db).delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
  return row ?? null;
}

async function nextSortOrder(db?: DbExecutor): Promise<number> {
  const [row] = await executor(db).select({ value: sql<string>`coalesce(max(${categories.sortOrder}), -1)` }).from(categories);
  return Number(row?.value ?? -1) + 1;
}
