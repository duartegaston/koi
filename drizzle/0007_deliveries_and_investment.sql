CREATE TABLE "supplier_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"note" varchar(160),
	"purchased_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_purchases_amount_check" CHECK ("supplier_purchases"."amount" > 0 AND "supplier_purchases"."amount" <= 9999999.99)
);
--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "deliveries_paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "supplier_purchases_purchased_on_idx" ON "supplier_purchases" USING btree ("purchased_on" DESC NULLS LAST,"created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "supplier_purchases" FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
DO $$
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

  ALTER TABLE supplier_purchases ENABLE ROW LEVEL SECURITY;
  ALTER TABLE supplier_purchases FORCE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE supplier_purchases FROM anon, authenticated;
END $$;