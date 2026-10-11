import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let db: Database | undefined;

function sslOption(connectionString: string): "require" | false {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode");
  if (sslmode === "disable" || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return false;
  }
  return "require";
}

/**
 * PostgreSQL estándar vía postgres.js. `prepare: false` permite poolers en
 * modo transaction (PgBouncer). `max: 1` porque cada isolate de Workers
 * no debe abrir un pool propio.
 */
export function getDb(): Database {
  if (!db) {
    const connectionString = getServerEnv().DATABASE_URL;
    const client = postgres(connectionString, {
      max: 1,
      prepare: false,
      fetch_types: false,
      ssl: sslOption(connectionString),
      connect_timeout: 10,
    });
    db = drizzle({ client, schema });
  }

  return db;
}

export { schema };
