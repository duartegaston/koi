import "server-only";

import type { z } from "zod";
import {
  countProductsInCategory,
  deleteCategory,
  findAdminCategory,
  insertCategory,
  reassignAndDeleteCategory,
  updateCategory,
} from "@/data-access/admin-category.repository";
import { isForeignKeyViolation, isUniqueViolation } from "@/data-access/executor";
import { slugify } from "@/lib/slug";
import type { categoryCreateSchema, categoryUpdateSchema } from "@/lib/validations/admin";
import { fail, type ServiceResult } from "./result";

type CategoryCreateInput = z.output<typeof categoryCreateSchema>;
type CategoryUpdateInput = z.output<typeof categoryUpdateSchema>;

export async function createCategory(input: CategoryCreateInput): Promise<ServiceResult<{ id: string }>> {
  const slug = categorySlug(input.name);
  if (!slug) return fail("invalid_name", "Usá un nombre con letras o números.");

  try {
    const created = await insertCategory({
      name: input.name,
      slug,
      description: input.description,
      isActive: true,
    });
    return { ok: true, value: { id: created.id } };
  } catch (error) {
    if (isUniqueViolation(error)) return fail("slug_taken", "Ya hay una categoría con ese nombre.");
    throw error;
  }
}

export async function editCategory(input: CategoryUpdateInput): Promise<ServiceResult<{ id: string }>> {
  try {
    const updated = await updateCategory(input.categoryId, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });
    if (!updated) return fail("not_found", "No encontramos esa categoría.");
    return { ok: true, value: { id: updated.id } };
  } catch (error) {
    if (isUniqueViolation(error)) return fail("slug_taken", "Ya hay una categoría con ese slug.");
    throw error;
  }
}

export async function removeCategory(id: string, reassignTo: string | null): Promise<ServiceResult<{ id: string }>> {
  const current = await findAdminCategory(id);
  if (!current) return fail("not_found", "No encontramos esa categoría.");

  const count = await countProductsInCategory(id);
  if (count > 0) {
    if (!reassignTo || reassignTo === id) {
      return fail("needs_reassign", "Elegí otra categoría para los productos.");
    }
    const target = await findAdminCategory(reassignTo);
    if (!target) return fail("reassign_missing", "Elegí otra categoría para los productos.");
  }

  try {
    if (count > 0 && reassignTo) {
      const deleted = await reassignAndDeleteCategory(id, reassignTo);
      if (!deleted) return fail("not_found", "No encontramos esa categoría.");
      return { ok: true, value: { id } };
    }

    const deleted = await deleteCategory(id);
    if (!deleted) return fail("not_found", "No encontramos esa categoría.");
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return fail("in_use", "Hay productos en esa categoría. Elegí a dónde moverlos.");
    }
    throw error;
  }

  return { ok: true, value: { id } };
}

function categorySlug(name: string): string {
  return slugify(name).slice(0, 140).replace(/-+$/g, "");
}
