import { z } from "zod";
import { orderStatuses, paymentMethods } from "@/data-access/order.repository";

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Ingresá el usuario.").max(80),
  password: z.string().min(1, "Ingresá la contraseña.").max(200),
});

const priceSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Ingresá un precio válido.")
  .refine((value) => Number(value) <= 9_999_999.99, "El precio es demasiado alto.");

const optionalLimit = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .pipe(
    z.union([
      z.null(),
      z
        .string()
        .regex(/^\d+$/, "El máximo por pedido tiene que ser un número.")
        .transform((value) => Number(value))
        .refine((value) => value > 0 && value <= 1000, "El máximo por pedido tiene que ser mayor a 0."),
    ]),
  );

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre.").max(160),
  slug: z
    .string()
    .trim()
    .min(1, "Ingresá el slug.")
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá minúsculas, números y guiones."),
  description: z.string().trim().min(1, "Ingresá la descripción.").max(4000),
  price: priceSchema,
  categoryId: z.uuid("Elegí una categoría."),
  stock: z.coerce.number().int("El stock tiene que ser un entero.").min(0).max(100_000),
  maxPerOrder: optionalLimit,
  isFeatured: z.boolean(),
  isActive: z.boolean(),
});

export const stockFormSchema = z.object({
  productId: z.uuid(),
  stock: z.coerce.number().int("El stock tiene que ser un entero.").min(0).max(100_000),
});

export const orderListSchema = z.object({
  status: z.enum(orderStatuses).optional(),
  paymentMethod: z.enum(paymentMethods).optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{1,16}$/, "El código no es válido.")
    .optional(),
  cursor: z.string().trim().min(1).optional(),
});

const categoryName = z.string().trim().min(1, "Ingresá el nombre.").max(120);
const categoryDescription = z
  .string()
  .trim()
  .max(2000, "La descripción es demasiado larga.")
  .transform((value) => (value.length === 0 ? null : value));

export const categoryCreateSchema = z.object({
  name: categoryName,
  description: categoryDescription,
});

export const categoryUpdateSchema = z.object({
  categoryId: z.uuid(),
  name: categoryName,
  slug: z
    .string()
    .trim()
    .min(1, "Ingresá el slug.")
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá minúsculas, números y guiones."),
  description: categoryDescription,
  sortOrder: z.coerce.number().int("El orden tiene que ser un entero.").min(0).max(10_000),
  isActive: z.boolean(),
});

export const categoryDeleteSchema = z.object({
  categoryId: z.uuid(),
  reassignTo: z.union([z.literal(""), z.uuid("Elegí una categoría.")]),
});

export type ProductFormInput = z.output<typeof productFormSchema>;
