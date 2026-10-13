import "server-only";

import { isInsidePosadas, nominatimViewbox, placeNameIncludes } from "@/lib/geocoding/posadas";

export type GeocodedPlace = {
  formattedAddress: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
};

export type GeocodeFailure = "not_found" | "outside" | "unavailable";

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country_code?: string;
};

type NominatimHit = {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: NominatimAddress;
};

export async function geocodeAddress(query: string): Promise<GeocodedPlace | GeocodeFailure> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("viewbox", nominatimViewbox());
  url.searchParams.set("q", query);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "es",
        "User-Agent": "koi/1.0 (checkout de envios en Posadas)",
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return "unavailable";
  }

  if (!response.ok) {
    return "unavailable";
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return "unavailable";
  }

  const hits = readHits(payload);
  const match = hits.find(
    (hit) =>
      isInsidePosadas(hit.latitude, hit.longitude) &&
      placeNameIncludes(hit.city, "Posadas") &&
      placeNameIncludes(hit.province, "Misiones"),
  );
  if (match) return match;
  return hits.length > 0 ? "outside" : "not_found";
}

function readHits(payload: unknown): GeocodedPlace[] {
  if (!Array.isArray(payload)) return [];

  const hits: GeocodedPlace[] = [];
  for (const value of payload) {
    const hit = readHit(value);
    if (hit) hits.push(hit);
  }
  return hits;
}

function readHit(value: unknown): GeocodedPlace | null {
  if (!value || typeof value !== "object") return null;
  const hit = value as NominatimHit;
  if (typeof hit.lat !== "string" || typeof hit.lon !== "string" || typeof hit.display_name !== "string" || !hit.address) {
    return null;
  }

  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  const city = hit.address.city ?? hit.address.town ?? hit.address.village ?? hit.address.municipality;
  const province = hit.address.state;
  if (!city || !province || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    formattedAddress: hit.display_name,
    city,
    province,
    latitude,
    longitude,
  };
}
