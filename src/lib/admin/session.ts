import "server-only";

import { cookies } from "next/headers";
import { readAdminSessionVersion } from "@/data-access/admin-session.repository";
import { getServerEnv } from "@/lib/env";

const cookieName = "koi_admin";
const maxAgeSeconds = 60 * 60 * 24 * 7;

export async function readAdminSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export async function writeAdminSession(): Promise<void> {
  const token = await signSessionToken();
  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: maxAgeSeconds,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete({ name: cookieName, path: "/admin" });
}

async function signSessionToken(): Promise<string> {
  const version = await readAdminSessionVersion();
  if (version === null) {
    throw new Error("admin_session_version_missing");
  }
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ exp: unixNow() + maxAgeSeconds, v: version })),
  );
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

async function verifySessionToken(token: string): Promise<boolean> {
  const separator = token.indexOf(".");
  if (separator <= 0 || separator !== token.lastIndexOf(".")) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const signatureBytes = base64UrlToBytes(signature);
  if (!signatureBytes || !(await verify(payload, signatureBytes))) return false;

  const payloadBytes = base64UrlToBytes(payload);
  if (!payloadBytes) return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return false;
  }
  if (!isSessionPayload(parsed) || parsed.exp <= unixNow()) return false;

  const version = await readAdminSessionVersion();
  return version !== null && parsed.v === version;
}

function isSessionPayload(value: unknown): value is { exp: number; v: number } {
  if (!value || typeof value !== "object") return false;
  const record = value as { exp?: unknown; v?: unknown };
  return (
    typeof record.exp === "number" &&
    Number.isFinite(record.exp) &&
    typeof record.v === "number" &&
    Number.isInteger(record.v) &&
    record.v >= 0
  );
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
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
