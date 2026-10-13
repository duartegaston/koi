import { NextRequest } from "next/server";
import { suggestAddresses } from "@/lib/geocoding/suggest";

export const dynamic = "force-dynamic";

const windowMs = 60_000;
const maxPerWindow = 40;
const hits = new Map<string, { count: number; resetAt: number }>();

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (query.length > 80) {
    return Response.json({ suggestions: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!allow(clientIp(request))) {
    return Response.json({ suggestions: [] }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }

  const suggestions = await suggestAddresses(query, request.signal);
  if (suggestions === "unavailable") {
    return Response.json({ suggestions: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  return Response.json({ suggestions }, { headers: { "Cache-Control": "no-store" } });
}

function clientIp(request: NextRequest): string {
  return request.headers.get("cf-connecting-ip") ?? "local";
}

function allow(ip: string): boolean {
  const now = Date.now();
  const current = hits.get(ip);
  if (!current || current.resetAt <= now) {
    if (hits.size > 500) hits.clear();
    hits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= maxPerWindow) return false;
  current.count += 1;
  return true;
}
