import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

let db: Database | undefined;

/**
 * Driver HTTP de Neon: cada query es un `fetch`, sin sockets TCP ni pool,
 * así que es seguro reutilizar la instancia entre requests en el Edge.
 */
export function getDb(): Database {
  db ??= drizzle({ client: neon(getServerEnv().DATABASE_URL), schema });
  return db;
}

export { schema };
