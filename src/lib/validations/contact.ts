import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre").max(120),
  email: z.email("Email inválido").max(254),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^\+?[1-9]\d{7,14}$/, "Teléfono inválido (formato E.164)")]))
    .transform((value) => (value === "" ? undefined : value.replace(/^\+/, ""))),
  message: z.string().trim().min(10, "El mensaje es muy corto").max(5000),
});

export type ContactInput = z.input<typeof contactSchema>;
