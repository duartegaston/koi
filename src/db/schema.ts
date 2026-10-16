import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  };
}

function money(name: string) {
  return numeric(name, { precision: 12, scale: 2 }).notNull();
}

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("contact_messages_email_idx").on(table.email),
    index("contact_messages_created_at_idx").on(table.createdAt.desc()),
  ],
);

/** Área de entrega: por ahora una sola fila, Posadas, Misiones. */
export const storeSettings = pgTable(
  "store_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    singleton: boolean("singleton").notNull().default(true),
    city: varchar("city", { length: 80 }).notNull().default("Posadas"),
    province: varchar("province", { length: 80 }).notNull().default("Misiones"),
    country: varchar("country", { length: 2 }).notNull().default("AR"),
    pickupAddress: text("pickup_address"),
    transferAlias: varchar("transfer_alias", { length: 80 }),
    originLatitude: numeric("origin_latitude", { precision: 8, scale: 6 }),
    originLongitude: numeric("origin_longitude", { precision: 9, scale: 6 }),
    /** Sube al cerrar sesión. Los tokens con una versión anterior dejan de valer. */
    adminSessionVersion: integer("admin_session_version").notNull().default(1),
    /** Aviso en la tienda. El checkout de envío sigue abierto. */
    deliveriesPaused: boolean("deliveries_paused").notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("store_settings_singleton_idx").on(table.singleton),
    check("store_settings_singleton_check", sql`${table.singleton} = true`),
    check(
      "store_settings_service_area_check",
      sql`${table.city} = 'Posadas' AND ${table.province} = 'Misiones' AND ${table.country} = 'AR'`,
    ),
    check(
      "store_settings_origin_check",
      sql`(
        ${table.originLatitude} IS NULL AND ${table.originLongitude} IS NULL
      ) OR (
        ${table.originLatitude} BETWEEN -90 AND 90
        AND ${table.originLongitude} BETWEEN -180 AND 180
      )`,
    ),
    check("store_settings_admin_session_version_check", sql`${table.adminSessionVersion} >= 0`),
  ],
);

/** Contador por IP y acción. Una fila por cubo, actualizada en el mismo INSERT. */
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    bucketKey: text("bucket_key").primaryKey(),
    hits: integer("hits").notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (table) => [check("rate_limit_buckets_hits_check", sql`${table.hits} > 0`)],
);

/** Bandas de radio desde el local. Gana la de menor alcance que cubre la distancia. */
export const shippingZones = pgTable(
  "shipping_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 80 }).notNull(),
    maxRadiusKm: numeric("max_radius_km", { precision: 6, scale: 2 }).notNull(),
    price: money("price"),
    sortOrder: integer("sort_order").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("shipping_zones_sort_order_idx").on(table.sortOrder),
    index("shipping_zones_active_radius_idx").on(table.isActive, table.maxRadiusKm),
    check("shipping_zones_radius_check", sql`${table.maxRadiusKm} > 0`),
    check("shipping_zones_price_check", sql`${table.price} >= 0`),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description").notNull(),
    price: money("price"),
    currency: varchar("currency", { length: 3 }).notNull().default("ARS"),
    stock: integer("stock").notNull().default(0),
    maxPerOrder: integer("max_per_order"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    uniqueIndex("products_slug_active_idx").on(table.slug).where(sql`${table.deletedAt} IS NULL`),
    check("products_price_check", sql`${table.price} >= 0`),
    check("products_currency_check", sql`${table.currency} = 'ARS'`),
    check("products_stock_check", sql`${table.stock} >= 0`),
    check("products_max_per_order_check", sql`${table.maxPerOrder} IS NULL OR ${table.maxPerOrder} > 0`),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: varchar("alt", { length: 200 }),
    sortOrder: integer("sort_order").notNull().default(0),
    objectKey: uuid("object_key"),
    ...timestamps(),
  },
  (table) => [
    index("product_images_product_id_idx").on(table.productId),
    uniqueIndex("product_images_object_key_idx").on(table.objectKey).where(sql`${table.objectKey} IS NOT NULL`),
  ],
);

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("carts_status_expires_at_idx").on(table.status, table.expiresAt),
    check("carts_status_check", sql`${table.status} IN ('active', 'converted', 'abandoned')`),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("cart_items_cart_product_idx").on(table.cartId, table.productId),
    index("cart_items_product_id_idx").on(table.productId),
    check("cart_items_quantity_check", sql`${table.quantity} > 0`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicCode: varchar("public_code", { length: 16 })
      .notNull()
      .unique()
      .default(sql`'KOI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))`),
    cartId: uuid("cart_id")
      .unique()
      .references(() => carts.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 32 }).notNull().default("pending_payment"),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
    customerEmail: varchar("customer_email", { length: 254 }),
    fulfillmentMethod: varchar("fulfillment_method", { length: 20 }).notNull(),
    addressLine: text("address_line"),
    geocodedAddress: text("geocoded_address"),
    city: varchar("city", { length: 80 }),
    province: varchar("province", { length: 80 }),
    latitude: numeric("latitude", { precision: 8, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    distanceKm: numeric("distance_km", { precision: 8, scale: 3 }),
    shippingZoneId: uuid("shipping_zone_id").references(() => shippingZones.id, {
      onDelete: "restrict",
    }),
    subtotal: money("subtotal"),
    shippingCost: money("shipping_cost"),
    total: money("total"),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
    ...timestamps(),
  },
  (table) => [
    index("orders_status_created_at_idx").on(table.status, table.createdAt.desc()),
    index("orders_created_at_id_idx").on(table.createdAt.desc(), table.id.desc()),
    index("orders_customer_phone_idx").on(table.customerPhone),
    index("orders_shipping_zone_id_idx").on(table.shippingZoneId),
    check(
      "orders_status_check",
      sql`${table.status} IN ('pending_payment', 'paid', 'cancelled', 'fulfilled')`,
    ),
    check(
      "orders_fulfillment_method_check",
      sql`${table.fulfillmentMethod} IN ('motorcycle', 'pickup')`,
    ),
    check(
      "orders_payment_method_check",
      sql`${table.paymentMethod} IN ('mercadopago', 'transfer', 'cash')`,
    ),
    check(
      "orders_cash_pickup_check",
      sql`${table.paymentMethod} <> 'cash' OR ${table.fulfillmentMethod} = 'pickup'`,
    ),
    check(
      "orders_motorcycle_transfer_check",
      sql`${table.fulfillmentMethod} <> 'motorcycle' OR ${table.paymentMethod} = 'transfer'`,
    ),
    check("orders_amounts_check", sql`${table.subtotal} >= 0 AND ${table.shippingCost} >= 0 AND ${table.total} >= 0`),
    check("orders_total_check", sql`${table.total} = ${table.subtotal} + ${table.shippingCost}`),
    check(
      "orders_motorcycle_posadas_check",
      sql`${table.fulfillmentMethod} <> 'motorcycle' OR (
        ${table.city} = 'Posadas'
        AND ${table.province} = 'Misiones'
        AND ${table.addressLine} IS NOT NULL
        AND ${table.latitude} IS NOT NULL
        AND ${table.longitude} IS NOT NULL
        AND ${table.distanceKm} IS NOT NULL
        AND ${table.shippingZoneId} IS NOT NULL
      )`,
    ),
    check(
      "orders_pickup_check",
      sql`${table.fulfillmentMethod} <> 'pickup' OR (
        ${table.shippingCost} = 0 AND ${table.shippingZoneId} IS NULL
      )`,
    ),
    check(
      "orders_coordinates_check",
      sql`(
        ${table.latitude} IS NULL AND ${table.longitude} IS NULL
      ) OR (
        ${table.latitude} BETWEEN -90 AND 90
        AND ${table.longitude} BETWEEN -180 AND 180
      )`,
    ),
    check(
      "orders_distance_check",
      sql`${table.distanceKm} IS NULL OR ${table.distanceKm} >= 0`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    productName: varchar("product_name", { length: 160 }).notNull(),
    unitPrice: money("unit_price"),
    quantity: integer("quantity").notNull(),
    madeToOrderQuantity: integer("made_to_order_quantity").notNull().default(0),
    lineTotal: money("line_total"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_product_id_idx").on(table.productId),
    check("order_items_quantity_check", sql`${table.quantity} > 0`),
    check(
      "order_items_made_to_order_check",
      sql`${table.madeToOrderQuantity} >= 0 AND ${table.madeToOrderQuantity} <= ${table.quantity}`,
    ),
    check("order_items_unit_price_check", sql`${table.unitPrice} >= 0`),
    check("order_items_line_total_check", sql`${table.lineTotal} = ${table.unitPrice} * ${table.quantity}`),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 20 }).notNull(),
    externalId: varchar("external_id", { length: 120 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    amount: money("amount"),
    ...timestamps(),
  },
  (table) => [
    index("payments_order_id_idx").on(table.orderId),
    uniqueIndex("payments_provider_external_id_idx")
      .on(table.provider, table.externalId)
      .where(sql`${table.externalId} IS NOT NULL`),
    check("payments_provider_check", sql`${table.provider} IN ('mercadopago', 'transfer', 'cash')`),
    check("payments_status_check", sql`${table.status} IN ('pending', 'approved', 'rejected')`),
    check("payments_amount_check", sql`${table.amount} >= 0`),
  ],
);

/** Compras al proveedor. El saldo del admin es lo cobrado en productos menos esto. */
export const supplierPurchases = pgTable(
  "supplier_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    amount: money("amount"),
    note: varchar("note", { length: 160 }),
    purchasedOn: date("purchased_on").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("supplier_purchases_purchased_on_idx").on(table.purchasedOn.desc(), table.createdAt.desc()),
    check("supplier_purchases_amount_check", sql`${table.amount} > 0 AND ${table.amount} <= 9999999.99`),
  ],
);

export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;
export type StoreSettings = typeof storeSettings.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type SupplierPurchase = typeof supplierPurchases.$inferSelect;
