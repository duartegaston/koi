CREATE TABLE "rate_limit_buckets" (
	"bucket_key" text PRIMARY KEY NOT NULL,
	"hits" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limit_buckets_hits_check" CHECK ("rate_limit_buckets"."hits" > 0)
);
--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "admin_session_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_admin_session_version_check" CHECK ("store_settings"."admin_session_version" >= 0);--> statement-breakpoint
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

  ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE rate_limit_buckets FORCE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE rate_limit_buckets FROM anon, authenticated;
END $$;