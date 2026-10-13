import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const workbookPath = path.join(repoRoot, "KOI .xlsx");
const imageDir =
  process.env.CATALOG_IMAGE_DIR ?? path.resolve(repoRoot, "../../imagenes rapanui");
const publicDir = path.join(repoRoot, "public", "productos");

const categoryLabels = {
  RAMA: "Ramas",
  CHOCOLATES: "Chocolates",
  "LINEA PISTACHO": "Línea pistacho",
  "LINEA MARROC": "Línea marroc",
  "MERMELADAS Y CREMAS": "Mermeladas y cremas",
  ALFAJORES: "Alfajores",
  "PAILAS Y GARAPIÑADAS": "Pailas y garapiñadas",
  OTROS: "Otros",
  CAFE: "Café",
};

const imageAliases = {
  "rama leche 60": "rama leche",
  "rama blanca 60": "rama blanco",
  "rama amarga 60": "rama amarga",
  "tableta de chocolate con leche": "chocolate con leche",
  "tableta de chocolate leche con almendras": "chocolate con leche y almendras",
  "tableta gota": "tableta gota grande",
};

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

function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

function unzip(entry) {
  return execFileSync("unzip", ["-p", workbookPath, entry], { maxBuffer: 20_000_000 }).toString("utf8");
}

function sharedStrings(xml) {
  return xml
    .split(/<si\b[^>]*>/)
    .slice(1)
    .map((part) => {
      const chunk = part.split("</si>")[0] ?? "";
      return [...chunk.matchAll(/<t\b[^>]*>([^<]*)<\/t>/g)].map((match) => decodeXml(match[1] ?? "")).join("");
    });
}

function columnIndex(letters) {
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index;
}

function sheetRows(xml, strings) {
  const rows = [];
  for (const rowXml of xml.split(/<row\b[^>]*>/).slice(1)) {
    const cells = new Map();
    for (const match of rowXml.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const index = columnIndex(match[1]);
      const attrs = match[2] ?? "";
      const value = (match[3] ?? "").match(/<v>([^<]*)<\/v>/);
      const raw = value?.[1] ?? "";
      cells.set(index, attrs.includes('t="s"') ? (strings[Number(raw)] ?? "") : raw);
    }
    rows.push(cells);
  }
  return rows;
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\.png$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(grs|gr|g)\b/g, " ")
    .replace(/garrapinadas|garrapinados/g, "garrapinad")
    .replace(/\s+/g, " ")
    .trim();
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

function wholePesos(raw) {
  const [whole, fraction = ""] = String(raw).trim().split(".");
  if (!/^\d+$/.test(whole)) throw new Error(`Precio inválido: ${raw}`);
  const pesos = Number(whole) + (Number((fraction + "0")[0]) >= 5 ? 1 : 0);
  if (pesos <= 0) throw new Error(`Precio inválido: ${raw}`);
  return pesos.toFixed(2);
}

function stockOf(raw) {
  const value = String(raw ?? "").trim();
  if (value === "") return 2;
  if (value.toLocaleUpperCase("es").includes("PEDIDO")) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Stock inválido: ${value}`);
  }
  return parsed;
}

function loadProducts() {
  const strings = sharedStrings(unzip("xl/sharedStrings.xml"));
  const rows = sheetRows(unzip("xl/worksheets/sheet1.xml"), strings);
  const images = new Map();
  for (const fileName of readdirSync(imageDir)) {
    if (!fileName.toLowerCase().endsWith(".png")) continue;
    images.set(normalizeName(fileName), path.join(imageDir, fileName));
  }

  const products = [];
  const seen = new Set();
  const skipped = [];
  for (const cells of rows) {
    const name = String(cells.get(1) ?? "").trim();
    if (!name || name.toLocaleUpperCase("es").startsWith("PRODUCTO") || name.toLocaleUpperCase("es").startsWith("KOI")) {
      continue;
    }
    if (seen.has(name)) {
      skipped.push(name);
      continue;
    }
    seen.add(name);

    const categoryKey = String(cells.get(3) ?? "").trim().toLocaleUpperCase("es");
    const categoryName = categoryLabels[categoryKey];
    if (!categoryName) throw new Error(`Categoría desconocida: ${categoryKey} (${name})`);

    const key = imageAliases[normalizeName(name)] ?? normalizeName(name);
    const imagePath = images.get(key);
    if (!imagePath) throw new Error(`Sin imagen para: ${name}`);
    images.delete(key);

    const description = String(cells.get(2) ?? "").trim();
    products.push({
      name,
      description: description || name,
      descriptionWasEmpty: description.length === 0,
      categoryName,
      price: wholePesos(cells.get(6)),
      stock: stockOf(cells.get(8)),
      // Columnas del Excel: F precio de venta, H pedido inicial. G es la ganancia.
      imagePath,
    });
  }

  return { products, skipped, unusedImages: [...images.values()] };
}

function assignSlugs(products) {
  const used = new Set();
  return products.map((product) => {
    const base = slugify(product.name);
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    return { ...product, slug };
  });
}

function imageExtension(filePath) {
  const bytes = readFileSync(filePath).subarray(0, 12);
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  throw new Error(`Formato de imagen no reconocido: ${filePath}`);
}

function copyImages(products) {
  rmSync(publicDir, { recursive: true, force: true });
  mkdirSync(publicDir, { recursive: true });
  for (const product of products) {
    const extension = imageExtension(product.imagePath);
    const fileName = `${product.slug}.${extension}`;
    copyFileSync(product.imagePath, path.join(publicDir, fileName));
    product.imageUrl = `/productos/${fileName}`;
  }
}

const connectionString = databaseUrl();
if (!connectionString) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const loaded = loadProducts();
const products = assignSlugs(loaded.products);
copyImages(products);

const categories = [];
for (const product of products) {
  if (!categories.some((category) => category.name === product.categoryName)) {
    categories.push({
      name: product.categoryName,
      slug: slugify(product.categoryName),
      sortOrder: categories.length + 1,
    });
  }
}

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl: sslOption(connectionString),
});

try {
  const removed = await sql.begin(async (tx) => {
    const payments = await tx`delete from payments`;
    const orderItems = await tx`delete from order_items`;
    const orders = await tx`delete from orders`;
    const cartItems = await tx`delete from cart_items`;
    const carts = await tx`delete from carts`;
    const deletedProducts = await tx`delete from products`;
    const deletedCategories = await tx`delete from categories`;

    const categoryIds = new Map();
    for (const category of categories) {
      const rows = await tx`
        insert into categories (name, slug, description, sort_order)
        values (${category.name}, ${category.slug}, ${null}, ${category.sortOrder})
        returning id, slug
      `;
      categoryIds.set(rows[0].slug, rows[0].id);
    }

    for (const product of products) {
      const categoryId = categoryIds.get(slugify(product.categoryName));
      const inserted = await tx`
        insert into products (category_id, name, slug, description, price, stock, is_featured)
        values (
          ${categoryId},
          ${product.name},
          ${product.slug},
          ${product.description},
          ${product.price},
          ${product.stock},
          false
        )
        returning id
      `;
      await tx`
        insert into product_images (product_id, url, alt, sort_order)
        values (${inserted[0].id}, ${product.imageUrl}, ${product.name}, 0)
      `;
    }

    return {
      payments: payments.count,
      orderItems: orderItems.count,
      orders: orders.count,
      cartItems: cartItems.count,
      carts: carts.count,
      products: deletedProducts.count,
      categories: deletedCategories.count,
    };
  });

  const summary = await sql`
    select
      (select count(*)::int from categories) as categories,
      (select count(*)::int from products where deleted_at is null) as products,
      (select count(*)::int from product_images) as images,
      (select count(*)::int from orders) as orders
  `;

  console.log(
    `Borrado: ${removed.orders} pedidos, ${removed.orderItems} ítems, ${removed.payments} pagos, ${removed.carts} carritos, ${removed.products} productos, ${removed.categories} categorías.`,
  );
  console.log(
    `Cargado: ${summary[0].categories} categorías, ${summary[0].products} productos, ${summary[0].images} imágenes. Pedidos: ${summary[0].orders}.`,
  );
  const emptyDescriptions = products.filter((product) => product.descriptionWasEmpty).map((product) => product.name);
  if (emptyDescriptions.length > 0) {
    console.log(`Sin descripción en el Excel (usé el nombre): ${emptyDescriptions.join("; ")}`);
  }
  if (loaded.skipped.length > 0) {
    console.log(`Filas repetidas, dejé la primera: ${loaded.skipped.join("; ")}`);
  }
  if (loaded.unusedImages.length > 0) {
    console.log(`Fotos sin producto en el Excel: ${loaded.unusedImages.map((file) => path.basename(file)).join("; ")}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
