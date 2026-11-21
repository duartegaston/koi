import { copyFileSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const csvPath = path.join(repoRoot, "navidad.csv");
const imageDir = path.join(repoRoot, "public/navidad");

const CATEGORY_NAME = "Navidad";
const CATEGORY_SLUG = "navidad";
const CATEGORY_DESCRIPTION =
  "A pedido hasta el 8 de diciembre. Se entregan antes de las fiestas.";

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

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function normalizeKey(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Parsea CSV con comillas y comas dentro de campos. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (char === "\r") i += 1;
      continue;
    }
    if (char === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** "$53.500" → "53500.00" (punto = miles AR). */
function parseArsPrice(raw) {
  const cleaned = String(raw ?? "")
    .trim()
    .replace(/^\$/, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Precio inválido: ${raw}`);
  }
  const pesos = Number(cleaned);
  if (!(pesos > 0)) throw new Error(`Precio inválido: ${raw}`);
  return pesos.toFixed(2);
}

function loadProducts() {
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const header = rows[0] ?? [];
  const nameIdx = header.findIndex((cell) => normalizeKey(cell) === "producto");
  const descIdx = header.findIndex((cell) => normalizeKey(cell) === "descripcion");
  const priceIdx = header.findIndex((cell) => normalizeKey(cell) === "precio final");
  if (nameIdx < 0 || descIdx < 0 || priceIdx < 0) {
    throw new Error("El CSV necesita columnas Producto, Descripcion y Precio final");
  }

  const imageFiles = readdirSync(imageDir).filter((name) => /\.(png|jpe?g|webp)$/i.test(name));
  const imagesByKey = new Map();
  const imagesBySlug = new Map();
  for (const fileName of imageFiles) {
    const stem = fileName.replace(/\.[^.]+$/, "").trim();
    const filePath = path.join(imageDir, fileName);
    imagesByKey.set(normalizeKey(stem), filePath);
    imagesBySlug.set(slugify(stem), filePath);
  }

  const products = [];
  const usedSlugs = new Set();
  const missingImages = [];

  for (const cells of rows.slice(1)) {
    const name = (cells[nameIdx] ?? "").trim();
    const description = (cells[descIdx] ?? "").trim();
    const priceRaw = (cells[priceIdx] ?? "").trim();
    if (!name || !priceRaw) continue;

    let slug = slugify(name);
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${slugify(name)}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);

    const imagePath = imagesByKey.get(normalizeKey(name)) ?? imagesBySlug.get(slug);
    if (!imagePath) {
      missingImages.push(name);
      continue;
    }

    const ext = path.extname(imagePath).toLowerCase();
    const publicName = `${slug}${ext}`;
    const publicPath = path.join(imageDir, publicName);
    if (path.resolve(imagePath) !== path.resolve(publicPath)) {
      copyFileSync(imagePath, publicPath);
    }

    products.push({
      name,
      slug,
      description: description || name,
      price: parseArsPrice(priceRaw),
      imageUrl: `/navidad/${publicName}`,
    });
  }

  if (missingImages.length > 0) {
    throw new Error(`Sin imagen en public/navidad: ${missingImages.join("; ")}`);
  }

  return products;
}

const connectionString = databaseUrl();
if (!connectionString) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const products = loadProducts();
const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl: sslOption(connectionString),
});

try {
  const summary = await sql.begin(async (tx) => {
    const existingCategory = await tx`
      select id from categories where slug = ${CATEGORY_SLUG} limit 1
    `;

    let categoryId;
    if (existingCategory[0]) {
      categoryId = existingCategory[0].id;
      await tx`
        update categories
        set
          name = ${CATEGORY_NAME},
          description = ${CATEGORY_DESCRIPTION},
          sort_order = 0,
          is_active = true,
          updated_at = now()
        where id = ${categoryId}
      `;
    } else {
      await tx`
        update categories
        set sort_order = sort_order + 1
        where sort_order >= 0
      `;
      const inserted = await tx`
        insert into categories (name, slug, description, sort_order)
        values (${CATEGORY_NAME}, ${CATEGORY_SLUG}, ${CATEGORY_DESCRIPTION}, 0)
        returning id
      `;
      categoryId = inserted[0].id;
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const product of products) {
      const existing = await tx`
        select id from products
        where slug = ${product.slug} and deleted_at is null
        limit 1
      `;

      let productId;
      if (existing[0]) {
        productId = existing[0].id;
        await tx`
          update products
          set
            category_id = ${categoryId},
            name = ${product.name},
            description = ${product.description},
            price = ${product.price},
            stock = 0,
            is_active = true,
            updated_at = now()
          where id = ${productId}
        `;
        updatedCount += 1;
      } else {
        const inserted = await tx`
          insert into products (
            category_id, name, slug, description, price, stock, is_featured, is_active
          )
          values (
            ${categoryId},
            ${product.name},
            ${product.slug},
            ${product.description},
            ${product.price},
            0,
            false,
            true
          )
          returning id
        `;
        productId = inserted[0].id;
        insertedCount += 1;
      }

      await tx`delete from product_images where product_id = ${productId}`;
      await tx`
        insert into product_images (product_id, url, alt, sort_order)
        values (${productId}, ${product.imageUrl}, ${product.name}, 0)
      `;
    }

    return { insertedCount, updatedCount, total: products.length };
  });

  console.log(
    `Navidad: ${summary.total} productos (${summary.insertedCount} nuevos, ${summary.updatedCount} actualizados). Categoría sort_order=0.`,
  );
} finally {
  await sql.end({ timeout: 5 });
}
