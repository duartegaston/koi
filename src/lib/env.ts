import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const optionalCoordinate = (limit: number) =>
  z
    .string()
    .trim()
    .regex(/^-?\d{1,3}(\.\d{1,16})?$/)
    .refine((value) => {
      const coordinate = Number(value);
      return coordinate >= -limit && coordinate <= limit;
    })
    .optional()
    .transform((value) => (value ? value : undefined));

const serverEnvSchema = z
  .object({
    APP_URL: z.url(),
    DATABASE_URL: z.url(),
    WHATSAPP_NUMBER: z
      .string()
      .trim()
      .regex(/^[1-9]\d{7,14}$/, "WHATSAPP_NUMBER debe ser el teléfono internacional, solo dígitos"),
    STORE_PICKUP_ADDRESS: optionalText(240),
    STORE_TRANSFER_ALIAS: optionalText(80),
    STORE_ORIGIN_LATITUDE: optionalCoordinate(90),
    STORE_ORIGIN_LONGITUDE: optionalCoordinate(180),
    MERCADOPAGO_ACCESS_TOKEN: optionalText(500),
    MERCADOPAGO_WEBHOOK_SECRET: optionalText(200),
    GOOGLE_MAPS_API_KEY: optionalText(200),
    ADMIN_USERNAME: z.string().trim().min(1).max(80),
    ADMIN_PASSWORD_HASH: z.string().regex(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/),
    ADMIN_SESSION_SECRET: z.string().min(32),
  })
  .superRefine((env, ctx) => {
    const hasLatitude = env.STORE_ORIGIN_LATITUDE !== undefined;
    const hasLongitude = env.STORE_ORIGIN_LONGITUDE !== undefined;
    if (hasLatitude !== hasLongitude) {
      ctx.addIssue({
        code: "custom",
        path: ["STORE_ORIGIN_LATITUDE"],
        message: "Definí latitud y longitud juntas",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

function readCloudflareEnv(): Partial<CloudflareEnv> {
  try {
    return getCloudflareContext().env;
  } catch {
    // Fuera de una request de Cloudflare (p. ej. `next build`).
    return {};
  }
}

/**
 * En Cloudflare `process.env` puede llegar vacío: las variables y secretos
 * llegan como bindings del contexto de la request, por eso se leen y validan
 * de forma perezosa y nunca al cargar el módulo.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(blankToUndefined({ ...process.env, ...readCloudflareEnv() }));
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Variables de entorno inválidas o ausentes: ${missing}`);
  }

  cached = parsed.data;
  return cached;
}

function blankToUndefined(source: object): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(source).flatMap(([key, value]) => {
      if (typeof value !== "string") return [];
      const trimmed = value.trim();
      return [[key, trimmed.length === 0 ? undefined : trimmed]];
    }),
  );
}
