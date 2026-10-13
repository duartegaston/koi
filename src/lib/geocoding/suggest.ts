import "server-only";

import { houseNumber } from "@/lib/geocoding/address-query";
import { placesAutocomplete } from "@/lib/geocoding/google";
import { placeNameIncludes } from "@/lib/geocoding/posadas";

export type AddressSuggestion = {
  id: string;
  label: string;
};

const addressTypes = new Set(["street_address", "route", "premise", "subpremise"]);

export async function suggestAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[] | "unavailable"> {
  const text = query.replace(/\s+/g, " ").trim();
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 3 || text.length > 80) return [];

  const payload = await placesAutocomplete(text, signal);
  if (payload === "unavailable") return "unavailable";
  return readSuggestions(payload, houseNumber(text));
}

function readSuggestions(payload: unknown, typedNumber: string | null): AddressSuggestion[] {
  if (!payload || typeof payload !== "object" || !("suggestions" in payload) || !Array.isArray(payload.suggestions)) {
    return [];
  }

  const suggestions: AddressSuggestion[] = [];
  for (const item of payload.suggestions) {
    const suggestion = readSuggestion(item, typedNumber);
    if (suggestion) suggestions.push(suggestion);
  }
  return dedupe(suggestions);
}

function readSuggestion(value: unknown, typedNumber: string | null): AddressSuggestion | null {
  if (!value || typeof value !== "object" || !("placePrediction" in value)) return null;
  const prediction = value.placePrediction;
  if (!prediction || typeof prediction !== "object") return null;

  const placeId = "placeId" in prediction && typeof prediction.placeId === "string" ? prediction.placeId : null;
  const mainText = readText(prediction, "mainText");
  const secondaryText = readText(prediction, "secondaryText");
  const types = "types" in prediction && Array.isArray(prediction.types) ? prediction.types : [];
  if (!placeId || placeId.length > 300 || !mainText) return null;
  if (!types.some((type) => typeof type === "string" && addressTypes.has(type))) return null;
  if (!secondaryText || !placeNameIncludes(secondaryText, "Posadas") || placeNameIncludes(secondaryText, "Garupa")) {
    return null;
  }

  const isRoute = types.includes("route") && !types.includes("street_address") && !types.includes("premise");
  const label = isRoute ? withTypedNumber(mainText, typedNumber) : mainText;
  return label.length <= 140 ? { id: placeId, label } : null;
}

function readText(prediction: object, field: "mainText" | "secondaryText"): string | null {
  if (!("structuredFormat" in prediction)) return null;
  const format = prediction.structuredFormat;
  if (!format || typeof format !== "object") return null;
  const block = (format as Record<string, unknown>)[field];
  if (!block || typeof block !== "object" || !("text" in block) || typeof block.text !== "string") return null;
  const text = block.text.trim();
  return text.length > 0 && text.length <= 180 ? text : null;
}

function withTypedNumber(street: string, typedNumber: string | null): string {
  if (!typedNumber || street.endsWith(` ${typedNumber}`)) return street;
  const label = `${street} ${typedNumber}`;
  return label.length <= 140 ? label : street;
}

function dedupe(suggestions: AddressSuggestion[]): AddressSuggestion[] {
  const seen = new Set<string>();
  const unique: AddressSuggestion[] = [];
  for (const suggestion of suggestions) {
    const key = suggestion.label.toLocaleLowerCase("es-AR");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(suggestion);
    if (unique.length >= 5) break;
  }
  return unique;
}
