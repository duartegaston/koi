import "server-only";

import { houseNumber, presentStreet, streetSearchText } from "@/lib/geocoding/address-query";

export type AddressSuggestion = {
  id: string;
  label: string;
};

type CachedStreets = {
  at: number;
  names: string[];
};

const cache = new Map<string, CachedStreets>();
const cacheTtlMs = 10 * 60 * 1000;

export async function suggestAddresses(query: string): Promise<AddressSuggestion[] | "unavailable"> {
  const street = streetSearchText(query);
  if (street.length < 3 || street.length > 80) return [];

  const names = await streetNames(street);
  if (names === "unavailable") return "unavailable";

  const number = houseNumber(query);
  return names.map((name) => {
    const label = presentStreet(name);
    return {
      id: name,
      label: number ? `${label} ${number}` : label,
    };
  });
}

async function streetNames(street: string): Promise<string[] | "unavailable"> {
  const key = street.toLocaleLowerCase("es-AR");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < cacheTtlMs) return cached.names;

  const url = new URL("https://apis.datos.gob.ar/georef/api/calles");
  url.searchParams.set("nombre", street);
  url.searchParams.set("provincia", "Misiones");
  url.searchParams.set("departamento", "Capital");
  url.searchParams.set("max", "8");
  url.searchParams.set("campos", "nombre");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "koi/1.0 (checkout de envios en Posadas)",
      },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return "unavailable";
  }

  if (!response.ok) return "unavailable";

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return "unavailable";
  }

  const names = readStreetNames(payload);
  remember(key, names);
  return names;
}

function readStreetNames(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || !("calles" in payload) || !Array.isArray(payload.calles)) {
    return [];
  }

  const seen = new Set<string>();
  const names: string[] = [];
  for (const street of payload.calles) {
    if (!street || typeof street !== "object" || !("nombre" in street) || typeof street.nombre !== "string") continue;
    const name = street.nombre.trim();
    if (name.length === 0 || name.length > 120) continue;
    const key = name.toLocaleLowerCase("es-AR");
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

function remember(key: string, names: string[]) {
  cache.delete(key);
  while (cache.size >= 50) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), names });
}
