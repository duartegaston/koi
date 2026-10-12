import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

export function mediaPath(objectKey: string): string {
  return `/media/${objectKey}`;
}

export async function putProductImage(objectKey: string, bytes: Uint8Array, contentType: string): Promise<void> {
  await productImageBucket().put(objectKey, bytes, { httpMetadata: { contentType } });
}

export async function readProductImage(objectKey: string) {
  return productImageBucket().get(objectKey);
}

export async function deleteProductImageObject(objectKey: string): Promise<void> {
  await productImageBucket().delete(objectKey);
}

function productImageBucket(): R2Bucket {
  let bucket: R2Bucket | undefined;
  try {
    bucket = getCloudflareContext().env.PRODUCT_IMAGES;
  } catch {
    bucket = undefined;
  }
  if (!bucket) {
    throw new Error("Falta el binding PRODUCT_IMAGES");
  }
  return bucket;
}
