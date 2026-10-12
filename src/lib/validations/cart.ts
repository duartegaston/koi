import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.uuid(),
});

export const setQuantitySchema = z.object({
  productId: z.uuid(),
  quantity: z.coerce.number().int().min(0).max(999),
});
