import "server-only";

import { sql } from "drizzle-orm";
import { executor } from "./executor";

/**
 * Suma un intento en el cubo y dice si todavía entra en el tope.
 * El INSERT ... ON CONFLICT evita que dos requests paralelos se salteen el límite.
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await executor().execute<{ hits: number | string }>(sql`
    insert into rate_limit_buckets (bucket_key, hits, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    on conflict (bucket_key) do update
    set
      hits = case
        when rate_limit_buckets.reset_at <= now() then 1
        else rate_limit_buckets.hits + 1
      end,
      reset_at = case
        when rate_limit_buckets.reset_at <= now() then now() + make_interval(secs => ${windowSeconds})
        else rate_limit_buckets.reset_at
      end
    returning hits
  `);

  const hits = Number(rows[0]?.hits);
  return Number.isInteger(hits) && hits <= limit;
}
