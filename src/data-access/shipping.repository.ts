import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { schema } from "@/db";
import { executor, type DbExecutor } from "./executor";

const { shippingZones } = schema;

export type ShippingZoneRecord = {
  id: string;
  name: string;
  maxRadiusKm: string;
  price: string;
};

export async function listShippingZones(db?: DbExecutor): Promise<ShippingZoneRecord[]> {
  return executor(db)
    .select({
      id: shippingZones.id,
      name: shippingZones.name,
      maxRadiusKm: shippingZones.maxRadiusKm,
      price: shippingZones.price,
    })
    .from(shippingZones)
    .where(eq(shippingZones.isActive, true))
    .orderBy(asc(shippingZones.maxRadiusKm));
}

/** La banda más chica cuyo radio todavía cubre la distancia. */
export async function findShippingZone(distanceKm: number, db?: DbExecutor): Promise<ShippingZoneRecord | null> {
  const [row] = await executor(db)
    .select({
      id: shippingZones.id,
      name: shippingZones.name,
      maxRadiusKm: shippingZones.maxRadiusKm,
      price: shippingZones.price,
    })
    .from(shippingZones)
    .where(and(eq(shippingZones.isActive, true), sql`${shippingZones.maxRadiusKm} >= ${distanceKm}`))
    .orderBy(asc(shippingZones.maxRadiusKm))
    .limit(1);

  return row ?? null;
}
