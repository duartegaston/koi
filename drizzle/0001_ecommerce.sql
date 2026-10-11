CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_quantity_check" CHECK ("cart_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_status_check" CHECK ("carts"."status" IN ('active', 'converted', 'abandoned'))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(160) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_check" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_price_check" CHECK ("order_items"."unit_price" >= 0),
	CONSTRAINT "order_items_line_total_check" CHECK ("order_items"."line_total" = "order_items"."unit_price" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_code" varchar(16) DEFAULT 'KOI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) NOT NULL,
	"cart_id" uuid,
	"status" varchar(32) DEFAULT 'pending_payment' NOT NULL,
	"customer_name" varchar(120) NOT NULL,
	"customer_phone" varchar(20) NOT NULL,
	"customer_email" varchar(254),
	"fulfillment_method" varchar(20) NOT NULL,
	"address_line" text,
	"city" varchar(80),
	"province" varchar(80),
	"latitude" numeric(8, 6),
	"longitude" numeric(9, 6),
	"distance_km" numeric(8, 3),
	"shipping_zone_id" uuid,
	"subtotal" numeric(12, 2) NOT NULL,
	"shipping_cost" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_public_code_unique" UNIQUE("public_code"),
	CONSTRAINT "orders_cart_id_unique" UNIQUE("cart_id"),
	CONSTRAINT "orders_status_check" CHECK ("orders"."status" IN ('pending_payment', 'paid', 'cancelled', 'fulfilled')),
	CONSTRAINT "orders_fulfillment_method_check" CHECK ("orders"."fulfillment_method" IN ('motorcycle', 'pickup')),
	CONSTRAINT "orders_payment_method_check" CHECK ("orders"."payment_method" IN ('mercadopago', 'transfer')),
	CONSTRAINT "orders_amounts_check" CHECK ("orders"."subtotal" >= 0 AND "orders"."shipping_cost" >= 0 AND "orders"."total" >= 0),
	CONSTRAINT "orders_total_check" CHECK ("orders"."total" = "orders"."subtotal" + "orders"."shipping_cost"),
	CONSTRAINT "orders_motorcycle_posadas_check" CHECK ("orders"."fulfillment_method" <> 'motorcycle' OR (
        "orders"."city" = 'Posadas'
        AND "orders"."province" = 'Misiones'
        AND "orders"."address_line" IS NOT NULL
        AND "orders"."latitude" IS NOT NULL
        AND "orders"."longitude" IS NOT NULL
        AND "orders"."distance_km" IS NOT NULL
        AND "orders"."shipping_zone_id" IS NOT NULL
      )),
	CONSTRAINT "orders_pickup_check" CHECK ("orders"."fulfillment_method" <> 'pickup' OR (
        "orders"."shipping_cost" = 0 AND "orders"."shipping_zone_id" IS NULL
      )),
	CONSTRAINT "orders_coordinates_check" CHECK ((
        "orders"."latitude" IS NULL AND "orders"."longitude" IS NULL
      ) OR (
        "orders"."latitude" BETWEEN -90 AND 90
        AND "orders"."longitude" BETWEEN -180 AND 180
      )),
	CONSTRAINT "orders_distance_check" CHECK ("orders"."distance_km" IS NULL OR "orders"."distance_km" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"external_id" varchar(120),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_check" CHECK ("payments"."provider" IN ('mercadopago', 'transfer')),
	CONSTRAINT "payments_status_check" CHECK ("payments"."status" IN ('pending', 'approved', 'rejected')),
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" varchar(200),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'ARS' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"max_per_order" integer,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "products_price_check" CHECK ("products"."price" >= 0),
	CONSTRAINT "products_currency_check" CHECK ("products"."currency" = 'ARS'),
	CONSTRAINT "products_stock_check" CHECK ("products"."stock" >= 0),
	CONSTRAINT "products_max_per_order_check" CHECK ("products"."max_per_order" IS NULL OR "products"."max_per_order" > 0)
);
--> statement-breakpoint
CREATE TABLE "shipping_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"max_radius_km" numeric(6, 2) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"sort_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_zones_radius_check" CHECK ("shipping_zones"."max_radius_km" > 0),
	CONSTRAINT "shipping_zones_price_check" CHECK ("shipping_zones"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton" boolean DEFAULT true NOT NULL,
	"city" varchar(80) DEFAULT 'Posadas' NOT NULL,
	"province" varchar(80) DEFAULT 'Misiones' NOT NULL,
	"country" varchar(2) DEFAULT 'AR' NOT NULL,
	"pickup_address" text,
	"origin_latitude" numeric(8, 6),
	"origin_longitude" numeric(9, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_singleton_check" CHECK ("store_settings"."singleton" = true),
	CONSTRAINT "store_settings_service_area_check" CHECK ("store_settings"."city" = 'Posadas' AND "store_settings"."province" = 'Misiones' AND "store_settings"."country" = 'AR'),
	CONSTRAINT "store_settings_origin_check" CHECK ((
        "store_settings"."origin_latitude" IS NULL AND "store_settings"."origin_longitude" IS NULL
      ) OR (
        "store_settings"."origin_latitude" BETWEEN -90 AND 90
        AND "store_settings"."origin_longitude" BETWEEN -180 AND 180
      ))
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_zone_id_shipping_zones_id_fk" FOREIGN KEY ("shipping_zone_id") REFERENCES "public"."shipping_zones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_product_idx" ON "cart_items" USING btree ("cart_id","product_id");--> statement-breakpoint
CREATE INDEX "cart_items_product_id_idx" ON "cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "carts_status_expires_at_idx" ON "carts" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_customer_phone_idx" ON "orders" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "orders_shipping_zone_id_idx" ON "orders" USING btree ("shipping_zone_id");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_external_id_idx" ON "payments" USING btree ("provider","external_id") WHERE "payments"."external_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "product_images_product_id_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_active_idx" ON "products" USING btree ("slug") WHERE "products"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_zones_sort_order_idx" ON "shipping_zones" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "shipping_zones_active_radius_idx" ON "shipping_zones" USING btree ("is_active","max_radius_km");--> statement-breakpoint
CREATE UNIQUE INDEX "store_settings_singleton_idx" ON "store_settings" USING btree ("singleton");--> statement-breakpoint
INSERT INTO "store_settings" DEFAULT VALUES;--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "carts" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "cart_items" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "categories" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "orders" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "payments" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "product_images" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "products" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "shipping_zones" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "store_settings" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
ALTER TABLE "contact_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "store_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipping_zones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "carts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cart_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;