ALTER TABLE "cart_items" ADD COLUMN "unit_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "gift_recipient_name" varchar(120);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "gift_recipient_contact" varchar(254);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "gift_message" varchar(500);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "gift_recipient_name" varchar(120);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "gift_recipient_contact" varchar(254);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "gift_message" varchar(500);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "custom_amount" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_unit_price_check" CHECK ("cart_items"."unit_price" IS NULL OR ("cart_items"."unit_price" > 0 AND "cart_items"."unit_price" <= 9999999.99));--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_gift_check" CHECK ((
        "cart_items"."gift_recipient_name" IS NULL
        AND "cart_items"."gift_recipient_contact" IS NULL
        AND "cart_items"."gift_message" IS NULL
      ) OR (
        "cart_items"."gift_recipient_name" IS NOT NULL
        AND "cart_items"."gift_recipient_contact" IS NOT NULL
      ));--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_gift_check" CHECK ((
        "order_items"."gift_recipient_name" IS NULL
        AND "order_items"."gift_recipient_contact" IS NULL
        AND "order_items"."gift_message" IS NULL
      ) OR (
        "order_items"."gift_recipient_name" IS NOT NULL
        AND "order_items"."gift_recipient_contact" IS NOT NULL
      ));