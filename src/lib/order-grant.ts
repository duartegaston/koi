import "server-only";

import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";

const cookieName = "koi_order";
const maxAgeSeconds = 60 * 60 * 24 * 7;

export const orderPublicCodePattern = /^KOI-[A-Z0-9]{8}$/;

type Grant = {
  code: string;
  exp: number;
  pay?: string;
};

export async function writeOrderGrant(code: string, checkoutUrl: string | null): Promise<void> {
  if (!orderPublicCodePattern.test(code)) {
    throw new Error("Código de pedido inválido");
  }
  const grant: Grant = {
    code,
    exp: unixNow() + maxAgeSeconds,
    ...(checkoutUrl ? { pay: checkoutUrl } : {}),
  };
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(grant)));
  const token = `${payload}.${await sign(payload)}`;
  const jar = await cookies();
  jar.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/checkout/pedido",
    maxAge: maxAgeSeconds,
  });
}

/** `null` si la cookie no autoriza ese código. `checkoutUrl` es el cobro de Mercado Pago, si hubo. */
export async function readOrderGrant(code: string): Promise<{ checkoutUrl: string | null } | null> {
  if (!orderPublicCodePattern.test(code)) return null;
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  const grant = token ? await verifyGrant(token) : null;
  if (!grant || grant.code !== code) return null;
  return { checkoutUrl: grant.pay ?? null };
}

async function verifyGrant(token: string): Promise<Grant | null> {
  const separator = token.indexOf(".");
  if (separator <= 0 || separator !== token.lastIndexOf(".")) return null;

  const payload = token.slice(0, separator);
  const signature = base64UrlToBytes(token.slice(separator + 1));
  if (!signature || !(await verify(payload, signature))) return null;

  const payloadBytes = base64UrlToBytes(payload);
  if (!payloadBytes) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }
  if (!isGrant(parsed) || parsed.exp <= unixNow()) return null;
  return parsed;
}

function isGrant(value: unknown): value is Grant {
  if (!value || typeof value !== "object") return false;
  const record = value as { code?: unknown; exp?: unknown; pay?: unknown };
  if (typeof record.code !== "string" || !orderPublicCodePattern.test(record.code)) return false;
  if (typeof record.exp !== "number" || !Number.isFinite(record.exp)) return false;
  if (record.pay !== undefined && (typeof record.pay !== "string" || record.pay.length > 500)) return false;
  return true;
}

async function sign(payload: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verify(payload: string, signature: Uint8Array): Promise<boolean> {
  return crypto.subtle.verify("HMAC", await hmacKey(), toArrayBuffer(signature), new TextEncoder().encode(payload));
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getServerEnv().ADMIN_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      const code = binary.charCodeAt(index);
      bytes[index] = code;
    }
    return bytes;
  } catch {
    return null;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
