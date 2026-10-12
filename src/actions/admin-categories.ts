"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { categoryCreateSchema, categoryDeleteSchema, categoryUpdateSchema } from "@/lib/validations/admin";
import { requireAdmin } from "@/services/admin-auth.service";
import { createCategory, editCategory, removeCategory } from "@/services/admin-category.service";

export type CategoryFormState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<string, string[]>> };

const initialError = "No pudimos guardar la categoría.";

export async function createCategoryAction(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdmin();
  const parsed = categoryCreateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", message: "Revisá los datos de la categoría.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const created = await createCategory(parsed.data);
  if (!created.ok) {
    return {
      status: "error",
      message: created.message,
      fieldErrors: created.code === "slug_taken" ? { name: [created.message] } : undefined,
    };
  }

  revalidateCatalog();
  return { status: "saved" };
}

export async function updateCategoryAction(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdmin();
  const parsed = categoryUpdateSchema.safeParse({
    categoryId: String(formData.get("categoryId") ?? ""),
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? ""),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { status: "error", message: "Revisá los datos de la categoría.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const updated = await editCategory(parsed.data);
  if (!updated.ok) {
    return {
      status: "error",
      message: updated.message,
      fieldErrors: updated.code === "slug_taken" ? { slug: [updated.message] } : undefined,
    };
  }

  revalidateCatalog();
  return { status: "saved" };
}

export async function deleteCategoryAction(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdmin();
  const parsed = categoryDeleteSchema.safeParse({
    categoryId: String(formData.get("categoryId") ?? ""),
    reassignTo: String(formData.get("reassignTo") ?? ""),
  });
  if (!parsed.success) return { status: "error", message: initialError };

  const removed = await removeCategory(parsed.data.categoryId, parsed.data.reassignTo || null);
  if (!removed.ok) return { status: "error", message: removed.message };

  revalidateCatalog();
  return { status: "saved" };
}

function revalidateCatalog() {
  revalidatePath("/", "layout");
}
