import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cache } from "react";
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
 * modo transaction (PgBouncer). En `next dev` un pool chico deja
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
  if (process.env.NODE_ENV === "development") {
    db ??= openDatabase(4, 0);
    return db;
  }
  // Hyperdrive no conserva el socket entre requests. Un cliente guardado en el
  // módulo falla en la ficha y en el resumen apenas el isolate atiende otro pedido.
  return requestDatabase(5, 0);
}

export function getTransactionDb(): Database {
  if (process.env.NODE_ENV === "development") {
    transactions ??= openDatabase(1, 1);
    return transactions;
  }
  return requestDatabase(1, 1);
}

const requestDatabase = cache((max: number, maxPipeline: number) => openDatabase(max, maxPipeline));

function openDatabase(max: number, maxPipeline: number): Database {
  return drizzle({ client: createClient(max, maxPipeline, readHyperdriveUrl()), schema });
}

/**
 * En el Worker la conexión sale por Hyperdrive. El socket directo al pooler
 * de Supabase no llega a autenticarse y las consultas de la tienda fallan.
 * En `next dev` se sigue usando DATABASE_URL.
 */
function readHyperdriveUrl(): string | undefined {
  if (process.env.NODE_ENV === "development") return undefined;
  try {
    return getCloudflareContext().env.HYPERDRIVE?.connectionString;
  } catch {
    return undefined;
  }
}

function createClient(max: number, maxPipeline: number, hyperdriveUrl: string | undefined) {
  if (hyperdriveUrl) {
    return postgres(hyperdriveUrl, {
      max,
      prepare: true,
      fetch_types: false,
      connect_timeout: 10,
    });
  }

  const connectionString = getServerEnv().DATABASE_URL;
  return postgres(connectionString, {
    max,
    prepare: false,
    fetch_types: false,
    ssl: sslOption(connectionString),
    connect_timeout: 10,
    // El runtime de postgres 3.4 acepta max_pipeline; los tipos publicados no.
    max_pipeline: maxPipeline,
  } as postgres.Options<Record<string, never>>);
}

export { schema };
