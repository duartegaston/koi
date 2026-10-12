ALTER TABLE "product_images" ADD COLUMN "object_key" uuid;--> statement-breakpoint
CREATE INDEX "orders_created_at_id_idx" ON "orders" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_object_key_idx" ON "product_images" USING btree ("object_key") WHERE "product_images"."object_key" IS NOT NULL;
--> statement-breakpoint
DO $$
DECLARE
  tbl text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolbypassrls
  ) THEN
    RAISE NOTICE 'RLS no aplicado: el rol de la app no tiene BYPASSRLS';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    RAISE NOTICE 'RLS no aplicado: faltan los roles anon o authenticated';
    RETURN;
  END IF;

  FOREACH tbl IN ARRAY ARRAY[
    'contact_messages',
    'store_settings',
    'shipping_zones',
    'categories',
    'products',
    'product_images',
    'carts',
    'cart_items',
    'orders',
    'order_items',
    'payments'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', tbl);
  END LOOP;
END $$;