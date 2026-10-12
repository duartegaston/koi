ALTER TABLE "orders" DROP CONSTRAINT "orders_payment_method_check";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_provider_check";--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "made_to_order_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "geocoded_address" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_made_to_order_check" CHECK ("order_items"."made_to_order_quantity" >= 0 AND "order_items"."made_to_order_quantity" <= "order_items"."quantity");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cash_pickup_check" CHECK ("orders"."payment_method" <> 'cash' OR "orders"."fulfillment_method" = 'pickup');--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_method_check" CHECK ("orders"."payment_method" IN ('mercadopago', 'transfer', 'cash'));--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_provider_check" CHECK ("payments"."provider" IN ('mercadopago', 'transfer', 'cash'));