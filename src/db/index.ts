import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let db: Database | undefined;
let transactions: Database | undefined;

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
 * `max_pipeline` tiene que ser 0 en este pool. Con 1 el driver escribe la
 * consulta en curso y una más en el mismo socket (`sent.length < max_pipeline`).
 * El pooler de Supabase en el puerto 6543 no contesta y el request queda
 * colgado cerca de 60 segundos. En 0 las consultas de más esperan en cola.
 *
 * Las transacciones no pueden usar ese cliente: con `max_pipeline` 0 postgres.js
 * no marca la conexión como reservada al hacer BEGIN, y `sql.begin` falla.
 * `getTransactionDb()` abre una sola conexión con pipeline 1. Ahí un BEGIN y
 * las sentencias que siguen sí responden, y no se mezcla con el `Promise.all`
 * de las páginas.
 */
export function getDb(): Database {
  if (!db) {
    db = drizzle({ client: createClient(process.env.NODE_ENV === "development" ? 4 : 1, 0), schema });
  }

  return db;
}

export function getTransactionDb(): Database {
  if (!transactions) {
    transactions = drizzle({ client: createClient(1, 1), schema });
  }

  return transactions;
}

function createClient(max: number, maxPipeline: number) {
  const connectionString = getServerEnv().DATABASE_URL;
  return postgres(connectionString, {
    max,
    prepare: false,
    fetch_types: false,
    ssl: sslOption(connectionString),
    connect_timeout: 10,
    max_pipeline: maxPipeline,
  });
}

export { schema };
