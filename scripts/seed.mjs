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
    // Misma regla que Next: `\$` es un peso literal. `node --env-file` deja la barra.
    return value
      .replace(/\\\$/g, "\u0000")
      .replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, braced, plain) => process.env[braced ?? plain] ?? "")
      .replace(/\u0000/g, "$");
  } catch {
    return fromEnv;
  }
}

const connectionString = databaseUrl();
if (!connectionString) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

function sslOption(value) {
  const url = new URL(value);
  const sslmode = url.searchParams.get("sslmode");
  if (sslmode === "disable" || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return false;
  }
  return "require";
}

const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&h=1200&q=80`;

const retiredCategorySlugs = ["mesa", "cocina", "regalos"];
const retiredProductSlugs = [
  "cuenco-de-gres",
  "jarra-de-ceramica",
  "individual-de-lino",
  "florero-chico",
  "tabla-de-madera",
  "cuchara-de-madera",
  "olla-baja",
  "pano-de-cocina",
  "vela-de-soja",
];

const categories = [
  {
    slug: "ramas",
    name: "Ramas",
    description: "Chocolate en rama Rapanui, de Bariloche.",
    sortOrder: 1,
  },
  {
    slug: "tabletas",
    name: "Tabletas",
    description: "Tabletas Rapanui, amargas, con leche y con fruta.",
    sortOrder: 2,
  },
  {
    slug: "bombones",
    name: "Bombones",
    description: "Habanos y bombones rellenos.",
    sortOrder: 3,
  },
  {
    slug: "alfajores",
    name: "Alfajores",
    description: "Alfajores Rapanui de 60 g.",
    sortOrder: 4,
  },
];

const products = [
  {
    slug: "rama-leche-60",
    category: "ramas",
    name: "Rama leche 60 g",
    description: "Chocolate en rama con leche, Rapanui. 60 g. Sin TACC.",
    price: "5000.00",
    stock: 24,
    maxPerOrder: 6,
    featured: true,
    images: ["photo-1606312619070-d48b4c652a52", "photo-1481391319762-47dff72954d9"],
  },
  {
    slug: "rama-amarga-60",
    category: "ramas",
    name: "Rama amarga 60 g",
    description: "Chocolate en rama amargo, Rapanui. 60 g. Sin TACC.",
    price: "5000.00",
    stock: 20,
    maxPerOrder: 6,
    featured: true,
    images: ["photo-1511381939415-e44015466834"],
  },
  {
    slug: "rama-blanca-60",
    category: "ramas",
    name: "Rama blanca 60 g",
    description: "Chocolate en rama blanco, Rapanui. 60 g. Sin TACC.",
    price: "5000.00",
    stock: 18,
    maxPerOrder: 6,
    featured: true,
    images: ["photo-1548907040-4baa42d10919"],
  },
  {
    slug: "rama-mixta",
    category: "ramas",
    name: "Rama mixta",
    description: "Una rama de leche y una blanca, Rapanui. 120 g. Sin TACC.",
    price: "10000.00",
    stock: 12,
    maxPerOrder: 4,
    featured: false,
    images: ["photo-1575377427642-087cf684f29d"],
  },
  {
    slug: "ramon",
    category: "ramas",
    name: "Ramón",
    description: "Rama de chocolate con leche y corazón de chocolate blanco, Rapanui. 200 g. Sin TACC.",
    price: "16000.00",
    stock: 8,
    maxPerOrder: 2,
    featured: true,
    images: ["photo-1623660053975-cf75a8be0908"],
  },
  {
    slug: "tableta-amarga-80",
    category: "tabletas",
    name: "Tableta amarga 80%",
    description: "Tableta de chocolate amargo 80%, Rapanui. 80 g. Sin TACC.",
    price: "6500.00",
    stock: 16,
    maxPerOrder: 4,
    featured: true,
    images: ["photo-1610450949065-1f2841536c88"],
  },
  {
    slug: "tableta-amarga-90",
    category: "tabletas",
    name: "Tableta amarga 90%",
    description: "Tableta de chocolate amargo 90%, Rapanui. 80 g. Sin TACC.",
    price: "6500.00",
    stock: 10,
    maxPerOrder: 4,
    featured: false,
    images: ["photo-1587132137056-bfbf0166836e"],
  },
  {
    slug: "tableta-frambuesa",
    category: "tabletas",
    name: "Tableta con frambuesa",
    description: "Chocolate blanco con frambuesas y arándanos, Rapanui. 45 g.",
    price: "4500.00",
    stock: 14,
    maxPerOrder: 6,
    featured: true,
    images: ["photo-1493925410384-84f842e616fb"],
  },
  {
    slug: "tableta-sal-marina",
    category: "tabletas",
    name: "Tableta sal marina y caramelo",
    description: "Tableta de chocolate amargo con sal marina y caramelo, Rapanui. 100 g.",
    price: "7500.00",
    stock: 11,
    maxPerOrder: 4,
    featured: false,
    images: ["photo-1599599810769-bcde5a160d32"],
  },
  {
    slug: "habano-frambuesa",
    category: "bombones",
    name: "Habano de frambuesa",
    description: "Habano de chocolate amargo relleno con crema de vodka de frambuesa, Rapanui. 50 g. Sin TACC.",
    price: "6500.00",
    stock: 15,
    maxPerOrder: 4,
    featured: true,
    images: ["photo-1578985545062-69928b1d9587"],
  },
  {
    slug: "habano-crema-irlandesa",
    category: "bombones",
    name: "Habano de crema irlandesa",
    description: "Habano de chocolate con leche con praliné de avellanas y crema irlandesa, Rapanui. 50 g. Sin TACC.",
    price: "6500.00",
    stock: 15,
    maxPerOrder: 4,
    featured: false,
    images: ["photo-1464349095431-e9a21285b5f3"],
  },
  {
    slug: "alfajor-ddl",
    category: "alfajores",
    name: "Alfajor de dulce de leche",
    description: "Alfajor de dulce de leche bañado en chocolate semiamargo, Rapanui. 60 g.",
    price: "2500.00",
    stock: 30,
    maxPerOrder: 8,
    featured: true,
    images: ["photo-1548907040-4baa42d10919"],
  },
];

const zones = [
  { name: "Centro", maxRadiusKm: "3.00", price: "2500.00", sortOrder: 1 },
  { name: "Ciudad", maxRadiusKm: "8.00", price: "4500.00", sortOrder: 2 },
  { name: "Posadas", maxRadiusKm: "15.00", price: "7000.00", sortOrder: 3 },
];

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
        insert into store_settings (
          city, province, country, pickup_address, transfer_alias, origin_latitude, origin_longitude
        ) values (
          'Posadas',
          'Misiones',
          'AR',
          'Local de prueba, Posadas',
          'koi.prueba',
          -27.362100,
          -55.900900
        )
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

    const ordered = await tx`
      select count(*)::int as n
      from order_items
      join products on products.id = order_items.product_id
      where products.slug in ${tx(retiredProductSlugs)}
    `;
    if (ordered[0].n > 0) {
      throw new Error("Hay pedidos con el catálogo anterior. No se borró.");
    }

    await tx`
      delete from cart_items
      where product_id in (
        select id from products where slug in ${tx(retiredProductSlugs)}
      )
    `;
    await tx`delete from products where slug in ${tx(retiredProductSlugs)}`;
    await tx`delete from categories where slug in ${tx(retiredCategorySlugs)}`;

    const categoryIds = new Map();
    for (const category of categories) {
      const rows = await tx`
        insert into categories (name, slug, description, sort_order)
        values (${category.name}, ${category.slug}, ${category.description}, ${category.sortOrder})
        on conflict (slug) do update set
          name = excluded.name,
          description = excluded.description,
          sort_order = excluded.sort_order
        returning id, slug
      `;
      categoryIds.set(rows[0].slug, rows[0].id);
    }

    for (const product of products) {
      const categoryId = categoryIds.get(product.category);
      const existing = await tx`
        select id from products where slug = ${product.slug} and deleted_at is null
      `;
      const productId =
        existing[0]?.id ??
        (
          await tx`
            insert into products (
              category_id, name, slug, description, price, stock, max_per_order, is_featured
            ) values (
              ${categoryId},
              ${product.name},
              ${product.slug},
              ${product.description},
              ${product.price},
              ${product.stock},
              ${product.maxPerOrder},
              ${product.featured}
            )
            returning id
          `
        )[0].id;

      const images = await tx`select id from product_images where product_id = ${productId} limit 1`;
      if (images.length > 0) continue;

      for (const [index, imageId] of product.images.entries()) {
        await tx`
          insert into product_images (product_id, url, alt, sort_order)
          values (${productId}, ${photo(imageId)}, ${product.name}, ${index})
        `;
      }
    }
  });

  const summary = await sql`
    select
      (select count(*)::int from categories) as categories,
      (select count(*)::int from products where deleted_at is null) as products,
      (select count(*)::int from shipping_zones) as zones
  `;
  console.log(
    `Listo. ${summary[0].categories} categorías, ${summary[0].products} productos, ${summary[0].zones} zonas de envío.`,
  );
} finally {
  await sql.end({ timeout: 5 });
}
