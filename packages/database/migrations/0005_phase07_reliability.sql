ALTER TABLE "monitor_sources" ADD COLUMN "hint_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "live_deliveries" ADD CONSTRAINT "live_delivery_attempts_check" CHECK ("live_deliveries"."attempts" >= 0);--> statement-breakpoint
ALTER TABLE "live_deliveries" ADD CONSTRAINT "live_delivery_version_check" CHECK ("live_deliveries"."settings_version" > 0);
