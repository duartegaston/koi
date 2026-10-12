import { z } from "zod";
import { mercadoPagoOffered } from "@/lib/payment-options";

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().regex(/^[1-9]\d{7,14}$/, "Ingresá un teléfono válido, con código de área."));

export const quoteAddressSchema = z.object({
  address: z
    .string()
    .trim()
    .min(8, "Ingresá la dirección completa, dentro de Posadas.")
    .max(240),
});

export const placeOrderSchema = z
  .object({
    customerName: z.string().trim().min(2, "Ingresá tu nombre.").max(120),
    customerPhone: phoneSchema,
    customerEmail: z.union([z.literal(""), z.email("El email no es válido.").max(254)]),
    fulfillmentMethod: z.enum(["motorcycle", "pickup"], { message: "Elegí envío o retiro en el local." }),
    address: z.string().trim().max(240).optional().default(""),
    paymentMethod: z.enum(["mercadopago", "transfer", "cash"], {
      message: "Elegí transferencia o efectivo.",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentMethod === "motorcycle" && data.address.trim().length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Ingresá la dirección completa, dentro de Posadas.",
      });
    }
    if (data.fulfillmentMethod === "motorcycle" && data.paymentMethod !== "transfer") {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "El envío se paga por transferencia.",
      });
    }
    if (data.paymentMethod === "mercadopago" && !mercadoPagoOffered) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "Elegí transferencia o efectivo.",
      });
    }
    if (data.paymentMethod === "cash" && data.fulfillmentMethod !== "pickup") {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "El efectivo es solo para retiro en el local.",
      });
    }
  });

export type PlaceOrderInput = z.output<typeof placeOrderSchema>;
