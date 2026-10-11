import "server-only";

export type GeocodedPlace = {
  formattedAddress: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
};

export type GeocodeFailure = "not_found" | "unavailable";

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
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ar");
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

  const hit = Array.isArray(payload) ? payload[0] : undefined;
  if (!isHit(hit)) {
    return "not_found";
  }

  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  const city = hit.address.city ?? hit.address.town ?? hit.address.village ?? hit.address.municipality;
  const province = hit.address.state;
  if (!city || !province || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "not_found";
  }

  return {
    formattedAddress: hit.display_name,
    city,
    province,
    latitude,
    longitude,
  };
}

function isHit(value: unknown): value is NominatimHit & { address: NominatimAddress; display_name: string; lat: string; lon: string } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const hit = value as NominatimHit;
  return typeof hit.lat === "string" && typeof hit.lon === "string" && typeof hit.display_name === "string" && !!hit.address;
}
