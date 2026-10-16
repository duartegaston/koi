import "server-only";

import { headers } from "next/headers";

export async function requestClientIp(): Promise<string> {
  const headerStore = await headers();
  return clientIpFrom(headerStore.get("cf-connecting-ip"));
}

export function clientIpFrom(value: string | null): string {
  const ip = value?.trim() ?? "";
  if (ip.length === 0 || ip.length > 64) return "local";
  return ip;
}
