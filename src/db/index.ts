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
 * modo transaction (PgBouncer). En producción `max` queda en 1: cada isolate
 * de Workers no debe abrir un pool propio. En `next dev` un pool chico deja
 * que Navbar, la página y un `Promise.all` usen conexiones distintas.
 *
 * `max_pipeline` tiene que ser 0. Con 1 el driver igual escribe la consulta
 * en curso y una más en el mismo socket (`sent.length < max_pipeline`). El
 * pooler de Supabase en el puerto 6543 no contesta y el request queda
 * colgado cerca de 60 segundos. En 0 las consultas de más esperan en cola.
 */
export function getDb(): Database {
  if (!db) {
    const connectionString = getServerEnv().DATABASE_URL;
    const client = postgres(connectionString, {
      max: process.env.NODE_ENV === "development" ? 4 : 1,
      prepare: false,
      fetch_types: false,
      ssl: sslOption(connectionString),
      connect_timeout: 10,
      max_pipeline: 0,
    });
    db = drizzle({ client, schema });
  }

  return db;
}

export { schema };
