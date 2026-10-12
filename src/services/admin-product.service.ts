import "server-only";

import {
  categoryExists,
  deleteAdminImages,
  findAdminProduct,
  insertAdminImages,
  insertAdminProduct,
  setProductStock,
  softDeleteProduct as softDeleteProductRow,
  updateAdminProduct,
} from "@/data-access/admin-product.repository";
import { isUniqueViolation, transaction } from "@/data-access/executor";
import { deleteProductImageObject, mediaPath, putProductImage } from "@/lib/images/r2";
import { maxImagesPerProduct } from "@/lib/images/detect";
import { fromCents, toCents } from "@/lib/money";
import type { ProductFormInput } from "@/lib/validations/admin";
import { fail, type ServiceResult } from "./result";

export type PreparedImage = {
  bytes: Uint8Array;
  contentType: string;
};

export async function createProduct(
  input: ProductFormInput,
  images: PreparedImage[],
): Promise<ServiceResult<{ id: string }>> {
  if (images.length > maxImagesPerProduct) {
    return fail("too_many_images", `Podés subir hasta ${maxImagesPerProduct} fotos.`);
  }
  if (!(await categoryExists(input.categoryId))) {
    return fail("category_not_found", "Elegí una categoría.");
  }

  const price = fromCents(toCents(input.price));
  let keys: string[] = [];
  try {
    keys = await storeImages(images);
    const created = await transaction(async (tx) => {
      const product = await insertAdminProduct({ ...input, price }, tx);
      await insertAdminImages(
        product.id,
        keys.map((key, index) => ({
          url: mediaPath(key),
          alt: input.name,
          sortOrder: index,
          objectKey: key,
        })),
        tx,
      );
      return product;
    });
    return { ok: true, value: { id: created.id } };
  } catch (error) {
    await removeStored(keys);
    return imageFailure(error);
  }
}

export async function updateProduct(
  id: string,
  input: ProductFormInput,
  images: PreparedImage[],
  removeImageIds: string[],
): Promise<ServiceResult<{ id: string }>> {
  const current = await findAdminProduct(id);
  if (!current) return fail("product_not_found", "No encontramos ese producto.");
  if (!(await categoryExists(input.categoryId))) return fail("category_not_found", "Elegí una categoría.");

  const removing = new Set(removeImageIds.filter((imageId) => current.images.some((image) => image.id === imageId)));
  const remaining = current.images.filter((image) => !removing.has(image.id));
  if (remaining.length + images.length > maxImagesPerProduct) {
    return fail("too_many_images", `Podés dejar hasta ${maxImagesPerProduct} fotos.`);
  }

  const price = fromCents(toCents(input.price));
  const nextSort = remaining.reduce((max, image) => Math.max(max, image.sortOrder), -1) + 1;
  let keys: string[] = [];
  try {
    keys = await storeImages(images);
    const updated = await transaction(async (tx) => {
      const product = await updateAdminProduct(id, { ...input, price }, tx);
      if (!product) return null;
      const deleted = await deleteAdminImages(id, [...removing], tx);
      await insertAdminImages(
        id,
        keys.map((key, index) => ({
          url: mediaPath(key),
          alt: input.name,
          sortOrder: nextSort + index,
          objectKey: key,
        })),
        tx,
      );
      return deleted;
    });
    if (!updated) {
      await removeStored(keys);
      return fail("product_not_found", "No encontramos ese producto.");
    }
    await removeStored(updated.flatMap((image) => (image.objectKey ? [image.objectKey] : [])));
    return { ok: true, value: { id } };
  } catch (error) {
    await removeStored(keys);
    return imageFailure(error);
  }
}

export async function removeProduct(id: string): Promise<ServiceResult<{ id: string }>> {
  const deleted = await softDeleteProductRow(id);
  if (!deleted) return fail("product_not_found", "No encontramos ese producto.");
  return { ok: true, value: { id: deleted.id } };
}

export async function adjustStock(id: string, stock: number): Promise<ServiceResult<{ stock: number }>> {
  const updated = await setProductStock(id, stock);
  if (!updated) return fail("product_not_found", "No encontramos ese producto.");
  return { ok: true, value: { stock: updated.stock } };
}

async function storeImages(images: PreparedImage[]): Promise<string[]> {
  const keys: string[] = [];
  try {
    for (const image of images) {
      const key = crypto.randomUUID();
      await putProductImage(key, image.bytes, image.contentType);
      keys.push(key);
    }
    return keys;
  } catch (error) {
    await removeStored(keys);
    throw error;
  }
}

async function removeStored(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await deleteProductImageObject(key);
      } catch (error) {
        console.error("No se pudo borrar una foto del bucket", error instanceof Error ? error.message : "error");
      }
    }),
  );
}

function imageFailure(error: unknown): ServiceResult<{ id: string }> {
  if (isUniqueViolation(error)) return fail("slug_taken", "Ya hay un producto con ese slug.");
  if (error instanceof Error && error.message === "Falta el binding PRODUCT_IMAGES") {
    return fail("images_unavailable", "No pudimos guardar las fotos. Revisá el bucket de imágenes.");
  }
  throw error;
}
