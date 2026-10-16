import { NextRequest } from "next/server";
import { clientIpFrom } from "@/lib/client-ip";
import { suggestAddresses } from "@/lib/geocoding/suggest";
import { allowClient } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (query.length > 80) {
    return Response.json({ suggestions: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const allowed = await allowClient("addressSuggest", clientIpFrom(request.headers.get("cf-connecting-ip")));
  if (!allowed) {
    return Response.json({ suggestions: [] }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }

  const suggestions = await suggestAddresses(query, request.signal);
  if (suggestions === "unavailable") {
    return Response.json({ suggestions: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  return Response.json({ suggestions }, { headers: { "Cache-Control": "no-store" } });
}
