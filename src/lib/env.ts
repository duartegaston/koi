import "server-only";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { z } from "zod";

const serverEnvSchema = z.object({
  APP_URL: z.url(),
  DATABASE_URL: z.url(),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().min(1),
  WHATSAPP_CONTACT_TEMPLATE: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

function readCloudflareEnv(): Partial<CloudflareEnv> {
  try {
    return getRequestContext().env;
  } catch {
    // Fuera de una request de Cloudflare (p. ej. `next build`).
    return {};
  }
}

/**
 * En Cloudflare `process.env` está vacío: las variables y secretos llegan como
 * bindings del contexto de la request, por eso se leen y validan de forma
 * perezosa y nunca al cargar el módulo.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({ ...process.env, ...readCloudflareEnv() });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Variables de entorno inválidas o ausentes: ${missing}`);
  }

  cached = parsed.data;
  return cached;
}
