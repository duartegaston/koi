import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

const serverEnvSchema = z.object({
  APP_URL: z.url(),
  DATABASE_URL: z.url(),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  WHATSAPP_NUMBER: z
    .string()
    .trim()
    .regex(/^[1-9]\d{7,14}$/, "WHATSAPP_NUMBER debe ser el teléfono internacional, solo dígitos"),
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

  const parsed = serverEnvSchema.safeParse({ ...process.env, ...readCloudflareEnv() });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Variables de entorno inválidas o ausentes: ${missing}`);
  }

  cached = parsed.data;
  return cached;
}
