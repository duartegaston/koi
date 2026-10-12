"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { detectImage, maxImageBytes, maxImagesPerProduct } from "@/lib/images/detect";
import { productFormSchema, stockFormSchema } from "@/lib/validations/admin";
import { requireAdmin } from "@/services/admin-auth.service";
import { adjustStock, createProduct, removeProduct, updateProduct, type PreparedImage } from "@/services/admin-product.service";

export type ProductFormState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<string, string[]>> };

export type StockState = { status: "idle" } | { status: "error"; message: string } | { status: "saved" };

export async function createProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const parsed = productFormSchema.safeParse(readProductFields(formData));
  if (!parsed.success) {
    return { status: "error", message: "Revisá los datos del producto.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const images = await readImages(formData);
  if (!images.ok) return { status: "error", message: images.message };

  const created = await createProduct(parsed.data, images.images);
  if (!created.ok) {
    return {
      status: "error",
      message: created.message,
      fieldErrors: created.code === "slug_taken" ? { slug: [created.message] } : undefined,
    };
  }

  revalidateCatalog();
  redirect(`/admin/productos/${created.value.id}`);
}

export async function updateProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const id = String(formData.get("productId") ?? "");
  if (!z.uuid().safeParse(id).success) return { status: "error", message: "No encontramos ese producto." };

  const parsed = productFormSchema.safeParse(readProductFields(formData));
  if (!parsed.success) {
    return { status: "error", message: "Revisá los datos del producto.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const images = await readImages(formData);
  if (!images.ok) return { status: "error", message: images.message };

  const removeImageIds = formData.getAll("removeImage").filter((value): value is string => typeof value === "string");
  const ids = z.array(z.uuid()).safeParse(removeImageIds);
  if (!ids.success) return { status: "error", message: "No pudimos quitar esas fotos." };

  const updated = await updateProduct(id, parsed.data, images.images, ids.data);
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

export async function deleteProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const id = String(formData.get("productId") ?? "");
  if (!z.uuid().safeParse(id).success) return { status: "error", message: "No encontramos ese producto." };

  const deleted = await removeProduct(id);
  if (!deleted.ok) return { status: "error", message: deleted.message };

  revalidateCatalog();
  redirect("/admin/productos");
}

export async function updateStockAction(_prev: StockState, formData: FormData): Promise<StockState> {
  await requireAdmin();
  const parsed = stockFormSchema.safeParse({
    productId: String(formData.get("productId") ?? ""),
    stock: String(formData.get("stock") ?? ""),
  });
  if (!parsed.success) return { status: "error", message: "El stock tiene que ser un número entero, desde 0." };

  const updated = await adjustStock(parsed.data.productId, parsed.data.stock);
  if (!updated.ok) return { status: "error", message: updated.message };

  revalidateCatalog();
  return { status: "saved" };
}

function readProductFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    stock: String(formData.get("stock") ?? ""),
    maxPerOrder: String(formData.get("maxPerOrder") ?? ""),
    isFeatured: formData.get("isFeatured") === "on",
    isActive: formData.get("isActive") === "on",
  };
}

async function readImages(formData: FormData): Promise<{ ok: true; images: PreparedImage[] } | { ok: false; message: string }> {
  const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length > maxImagesPerProduct) {
    return { ok: false, message: `Podés subir hasta ${maxImagesPerProduct} fotos.` };
  }

  const images: PreparedImage[] = [];
  for (const file of files) {
    if (file.size > maxImageBytes) return { ok: false, message: "Cada foto tiene que pesar hasta 2 MB." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectImage(bytes);
    if (!detected) return { ok: false, message: "Cada foto tiene que ser JPEG, PNG o WebP." };
    images.push({ bytes, contentType: detected.contentType });
  }
  return { ok: true, images };
}

function revalidateCatalog() {
  revalidatePath("/", "layout");
}
