import "server-only";

import { getServerEnv } from "@/lib/env";

export const serviceArea = {
  city: "Posadas",
  province: "Misiones",
  country: "AR",
} as const;

export type StoreConfig = {
  city: typeof serviceArea.city;
  province: typeof serviceArea.province;
  pickupAddress: string | null;
  transferAlias: string | null;
  originLatitude: string | null;
  originLongitude: string | null;
  mercadoPagoConfigured: boolean;
};

export function readStoreConfig(): StoreConfig {
  const env = getServerEnv();
  return {
    city: serviceArea.city,
    province: serviceArea.province,
    pickupAddress: env.STORE_PICKUP_ADDRESS ?? null,
    transferAlias: env.STORE_TRANSFER_ALIAS ?? null,
    originLatitude: env.STORE_ORIGIN_LATITUDE ?? null,
    originLongitude: env.STORE_ORIGIN_LONGITUDE ?? null,
    mercadoPagoConfigured: Boolean(env.MERCADOPAGO_ACCESS_TOKEN),
  };
}
