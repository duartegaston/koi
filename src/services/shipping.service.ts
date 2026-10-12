import "server-only";

import { findShippingZone } from "@/data-access/shipping.repository";
import { distanceKm } from "@/lib/geo";
import { geocodeAddress } from "@/lib/geocoding/nominatim";
import { readStoreConfig } from "@/lib/store-config";
import { fail, type ServiceResult } from "./result";

export type StoreOptions = {
  city: string;
  province: string;
  pickupAddress: string | null;
  transferAlias: string | null;
  deliveryConfigured: boolean;
  mercadoPagoConfigured: boolean;
};

export type DeliveryQuote = {
  enteredAddress: string;
  formattedAddress: string;
  city: string;
  province: string;
  latitude: string;
  longitude: string;
  distanceKm: string;
  shippingZoneId: string;
  shippingZoneName: string;
  price: string;
};

export function getStoreOptions(): StoreOptions {
  const store = readStoreConfig();
  return {
    city: store.city,
    province: store.province,
    pickupAddress: store.pickupAddress,
    transferAlias: store.transferAlias,
    deliveryConfigured: store.originLatitude != null && store.originLongitude != null,
    mercadoPagoConfigured: store.mercadoPagoConfigured,
  };
}

export async function quoteDelivery(address: string): Promise<ServiceResult<DeliveryQuote>> {
  const trimmed = address.trim();
  if (trimmed.length < 8 || trimmed.length > 240) {
    return fail("address_invalid", "Ingresá la dirección completa, dentro de Posadas.");
  }

  const store = readStoreConfig();
  const originLatitude = store.originLatitude;
  const originLongitude = store.originLongitude;
  if (originLatitude == null || originLongitude == null) {
    return fail("store_origin_missing", "El local todavía no tiene la ubicación para calcular el envío.");
  }

  const place = await geocodeAddress(`${trimmed}, ${store.city}, ${store.province}, Argentina`);
  if (place === "unavailable") {
    return fail("geocoding_unavailable", "No pudimos ubicar la dirección. Probá de nuevo en unos minutos.");
  }
  if (place === "not_found") {
    return fail("address_not_found", "No encontramos esa dirección.");
  }
  if (!samePlace(place.city, store.city) || !samePlace(place.province, store.province)) {
    return fail("outside_posadas", "Por ahora el envío es solo dentro de Posadas, Misiones.");
  }

  const kilometers = distanceKm(
    { latitude: Number(originLatitude), longitude: Number(originLongitude) },
    place,
  );
  const zone = await findShippingZone(kilometers);
  if (!zone) {
    return fail(
      "outside_delivery_zone",
      "No llegamos a esa dirección. Podés retirar en el local.",
    );
  }

  return {
    ok: true,
    value: {
      enteredAddress: trimmed,
      formattedAddress: place.formattedAddress,
      city: store.city,
      province: store.province,
      latitude: place.latitude.toFixed(6),
      longitude: place.longitude.toFixed(6),
      distanceKm: kilometers.toFixed(3),
      shippingZoneId: zone.id,
      shippingZoneName: zone.name,
      price: zone.price,
    },
  };
}

function samePlace(value: string, expected: string): boolean {
  const left = normalizePlace(value);
  const right = normalizePlace(expected);
  return left === right || left.includes(right);
}

function normalizePlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
