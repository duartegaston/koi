import "server-only";

import { getServerEnv } from "@/lib/env";
import { geocodeBounds, isInsidePosadas, placeNameIncludes, posadasRectangle } from "@/lib/geocoding/posadas";

export type GeocodedPlace = {
  formattedAddress: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
};

export type GeocodeFailure = "not_found" | "outside" | "unavailable";

type AddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type GeocodeResult = {
  formatted_address?: string;
  partial_match?: boolean;
  address_components?: AddressComponent[];
  geometry?: {
    location?: { lat?: number; lng?: number };
    location_type?: string;
  };
};

export async function geocodeAddress(query: string): Promise<GeocodedPlace | GeocodeFailure> {
  const key = mapsKey();
  if (!key) return "unavailable";

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("components", "country:AR");
  url.searchParams.set("bounds", geocodeBounds());
  url.searchParams.set("region", "ar");
  url.searchParams.set("language", "es");
  url.searchParams.set("key", key);

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
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

  const status = readStatus(payload);
  if (status === "ZERO_RESULTS") return "not_found";
  if (status !== "OK") return "unavailable";

  return choosePlace(readResults(payload));
}

export async function placesAutocomplete(
  input: string,
  signal?: AbortSignal,
): Promise<unknown | "unavailable"> {
  const key = mapsKey();
  if (!key) return "unavailable";

  let response: Response;
  try {
    response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types",
      },
      body: JSON.stringify({
        input,
        languageCode: "es",
        regionCode: "ar",
        includedRegionCodes: ["ar"],
        includedPrimaryTypes: ["street_address", "route", "premise", "subpremise"],
        locationRestriction: { rectangle: posadasRectangle() },
      }),
      signal: signal ? AbortSignal.any([AbortSignal.timeout(8_000), signal]) : AbortSignal.timeout(8_000),
    });
  } catch (error) {
    if (isAbort(error)) return { suggestions: [] };
    return "unavailable";
  }

  if (!response.ok) return "unavailable";

  try {
    return await response.json();
  } catch {
    return "unavailable";
  }
}

function mapsKey(): string | null {
  return getServerEnv().GOOGLE_MAPS_API_KEY ?? null;
}

function choosePlace(results: RankedPlace[]): GeocodedPlace | GeocodeFailure {
  const inside = results.filter((place) => place.inside);
  const precise = inside.filter((place) => place.score > 0).sort((left, right) => right.score - left.score);
  const best = precise[0];
  if (best) return best.place;
  if (inside.length > 0) return "not_found";
  return results.length > 0 ? "outside" : "not_found";
}

type RankedPlace = {
  place: GeocodedPlace;
  inside: boolean;
  score: number;
};

function readResults(payload: unknown): RankedPlace[] {
  if (!payload || typeof payload !== "object" || !("results" in payload) || !Array.isArray(payload.results)) {
    return [];
  }

  const ranked: RankedPlace[] = [];
  for (const value of payload.results) {
    const place = readResult(value);
    if (place) ranked.push(place);
  }
  return ranked;
}

function readResult(value: unknown): RankedPlace | null {
  if (!value || typeof value !== "object") return null;
  const result = value as GeocodeResult;
  const latitude = result.geometry?.location?.lat;
  const longitude = result.geometry?.location?.lng;
  const formattedAddress = result.formatted_address?.trim();
  if (typeof latitude !== "number" || typeof longitude !== "number" || !formattedAddress) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || formattedAddress.length > 300) return null;

  const components = result.address_components ?? [];
  const city = componentName(components, "locality");
  const province = componentName(components, "administrative_area_level_1");
  const country = componentShortName(components, "country");
  if (!city || !province || country !== "AR") return null;

  const hasNumber = components.some((component) => component.types?.includes("street_number"));
  const locationType = result.geometry?.location_type;
  const inside =
    isInsidePosadas(latitude, longitude) &&
    placeNameIncludes(city, "Posadas") &&
    !placeNameIncludes(city, "Garupa") &&
    placeNameIncludes(province, "Misiones");

  return {
    inside,
    score: precision(locationType, hasNumber, result.partial_match === true),
    place: { formattedAddress, city, province, latitude, longitude },
  };
}

function precision(locationType: string | undefined, hasNumber: boolean, partial: boolean): number {
  if (partial || !hasNumber) return 0;
  if (locationType === "ROOFTOP") return 3;
  if (locationType === "RANGE_INTERPOLATED") return 2;
  if (locationType === "GEOMETRIC_CENTER") return 1;
  return 0;
}

function componentName(components: AddressComponent[], type: string): string | null {
  const match = components.find((component) => component.types?.includes(type));
  const name = match?.long_name?.trim();
  return name && name.length <= 120 ? name : null;
}

function componentShortName(components: AddressComponent[], type: string): string | null {
  const match = components.find((component) => component.types?.includes(type));
  const name = match?.short_name?.trim();
  return name && name.length <= 16 ? name : null;
}

function readStatus(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("status" in payload)) return null;
  return typeof payload.status === "string" ? payload.status : null;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
