import "server-only";

import { consumeRateLimit } from "@/data-access/rate-limit.repository";
import { requestClientIp } from "@/lib/client-ip";
import { errorCode } from "@/lib/error-code";
import { getServerEnv } from "@/lib/env";

const encoder = new TextEncoder();

const policies = {
  adminLogin: { limit: 5, windowSeconds: 15 * 60 },
  contact: { limit: 5, windowSeconds: 15 * 60 },
  checkoutPlace: { limit: 5, windowSeconds: 15 * 60 },
  deliveryQuote: { limit: 5, windowSeconds: 15 * 60 },
  addressSuggest: { limit: 40, windowSeconds: 60 },
} as const;

export type RateLimitScope = keyof typeof policies;

/** `false` si la IP superó el tope o si el contador no se pudo guardar. */
export async function allowClient(scope: RateLimitScope, ip?: string): Promise<boolean> {
  const policy = policies[scope];
  try {
    const clientIp = ip ?? (await requestClientIp());
    const key = await bucketKey(scope, clientIp);
    return await consumeRateLimit(key, policy.limit, policy.windowSeconds);
  } catch (error) {
    console.error("rate_limit", scope, errorCode(error));
    return false;
  }
}

async function bucketKey(scope: RateLimitScope, ip: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getServerEnv().ADMIN_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${scope}:${ip}`));
  const hex = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${scope}:${hex}`;
}
