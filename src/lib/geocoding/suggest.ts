import "server-only";

import { isInsidePosadas, nominatimViewbox, placeNameIncludes } from "@/lib/geocoding/posadas";

export type AddressSuggestion = {
  id: string;
  label: string;
};

type CachedSuggestions = {
  at: number;
  suggestions: AddressSuggestion[];
};

const cache = new Map<string, CachedSuggestions>();
const cacheTtlMs = 10 * 60 * 1000;

export async function suggestAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[] | "unavailable"> {
  const text = query.replace(/\s+/g, " ").trim();
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 3 || text.length > 80) return [];

  const key = text.toLocaleLowerCase("es-AR");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < cacheTtlMs) return cached.suggestions;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("viewbox", nominatimViewbox());
  url.searchParams.set("bounded", "1");
  url.searchParams.set("q", /posadas/i.test(text) ? text : `${text}, Posadas, Misiones`);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "es",
        "User-Agent": "koi/1.0 (checkout de envios en Posadas)",
      },
      signal: signal ? AbortSignal.any([AbortSignal.timeout(8_000), signal]) : AbortSignal.timeout(8_000),
    });
  } catch (error) {
    if (isAbort(error)) return [];
    return "unavailable";
  }

  if (!response.ok) return "unavailable";

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return "unavailable";
  }

  const suggestions = readSuggestions(payload);
  remember(key, suggestions);
  return suggestions;
}

function readSuggestions(payload: unknown): AddressSuggestion[] {
  if (!Array.isArray(payload)) return [];

  const seen = new Set<string>();
  const suggestions: AddressSuggestion[] = [];
  for (const item of payload) {
    const suggestion = readSuggestion(item);
    if (!suggestion) continue;
    const key = suggestion.label.toLocaleLowerCase("es-AR");
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(suggestion);
    if (suggestions.length >= 6) break;
  }
  return suggestions;
}

function readSuggestion(value: unknown): AddressSuggestion | null {
  if (!value || typeof value !== "object") return null;
  const hit = value as Record<string, unknown>;
  const address = hit.address;
  if (!address || typeof address !== "object") return null;
  const details = address as Record<string, unknown>;

  const latitude = typeof hit.lat === "string" ? Number(hit.lat) : Number.NaN;
  const longitude = typeof hit.lon === "string" ? Number(hit.lon) : Number.NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isInsidePosadas(latitude, longitude)) return null;

  const city = firstString(details, ["city", "town", "village", "municipality", "city_district"]);
  const province = firstString(details, ["state"]);
  const country = firstString(details, ["country_code"]);
  if (country !== "ar" || !city || !province) return null;
  if (!placeNameIncludes(city, "Posadas") || placeNameIncludes(city, "Garupa") || !placeNameIncludes(province, "Misiones")) {
    return null;
  }

  if (!isStreetOrHouse(hit, details)) return null;

  const id = typeof hit.place_id === "number" && Number.isSafeInteger(hit.place_id) ? String(hit.place_id) : null;
  const label = labelFor(details);
  if (!id || !label) return null;
  return { id, label };
}

function isStreetOrHouse(hit: Record<string, unknown>, details: Record<string, unknown>): boolean {
  const road = firstString(details, ["road"]);
  const number = firstString(details, ["house_number"]);
  if (hit.category === "highway" && hit.type !== "bus_stop" && road) return true;
  if (hit.category === "place" && hit.type === "house" && road && number) return true;
  if (hit.category === "building" && road && number) return true;
  return false;
}

function labelFor(details: Record<string, unknown>): string | null {
  const road = firstString(details, ["road"]);
  const number = firstString(details, ["house_number"]);
  const neighbourhood = firstString(details, ["neighbourhood"]);
  if (!road) return null;

  const line = number ? `${road} ${number}` : road;
  if (!neighbourhood || line.toLocaleLowerCase("es-AR").includes(neighbourhood.toLocaleLowerCase("es-AR"))) {
    return line.length <= 140 ? line : null;
  }

  const withNeighbourhood = `${line}, ${neighbourhood}`;
  return withNeighbourhood.length <= 140 ? withNeighbourhood : line;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text.length > 0 && text.length <= 120) return text;
  }
  return null;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function remember(key: string, suggestions: AddressSuggestion[]) {
  cache.delete(key);
  while (cache.size >= 50) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), suggestions });
}
