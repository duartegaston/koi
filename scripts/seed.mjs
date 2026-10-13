import { readFileSync } from "node:fs";
import postgres from "postgres";

function databaseUrl() {
  const fromEnv = process.env.DATABASE_URL;
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const line = raw.split(/\n/).find((entry) => entry.startsWith("DATABASE_URL="));
    if (!line) return fromEnv;
    let value = line.slice("DATABASE_URL=".length).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value
      .replace(/\\\$/g, "\u0000")
      .replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, braced, plain) => process.env[braced ?? plain] ?? "")
      .replace(/\u0000/g, "$");
  } catch {
    return fromEnv;
  }
}

function sslOption(value) {
  const url = new URL(value);
  const sslmode = url.searchParams.get("sslmode");
  if (sslmode === "disable" || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return false;
  }
  return "require";
}

const zones = [
  { name: "Centro", maxRadiusKm: "3.00", price: "2500.00", sortOrder: 1 },
  { name: "Ciudad", maxRadiusKm: "8.00", price: "4500.00", sortOrder: 2 },
  { name: "Posadas", maxRadiusKm: "15.00", price: "7000.00", sortOrder: 3 },
];

const connectionString = databaseUrl();
if (!connectionString) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl: sslOption(connectionString),
});

try {
  await sql.begin(async (tx) => {
    const settings = await tx`select id from store_settings limit 1`;
    if (settings.length === 0) {
      await tx`
        insert into store_settings (city, province, country)
        values ('Posadas', 'Misiones', 'AR')
      `;
    }

    const zoneCount = await tx`select count(*)::int as n from shipping_zones`;
    if (zoneCount[0].n === 0) {
      for (const zone of zones) {
        await tx`
          insert into shipping_zones (name, max_radius_km, price, sort_order)
          values (${zone.name}, ${zone.maxRadiusKm}, ${zone.price}, ${zone.sortOrder})
        `;
      }
    }
  });

  const summary = await sql`select count(*)::int as n from shipping_zones`;
  console.log(`Listo. ${summary[0].n} zonas de envío. El catálogo se carga con scripts/import-catalog.mjs.`);
} finally {
  await sql.end({ timeout: 5 });
}
