CREATE TABLE "notification_settings" (
	"subscription_id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"role_id" text,
	"template" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_settings_channel_check" CHECK ("notification_settings"."channel_id" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "notification_settings_role_check" CHECK ("notification_settings"."role_id" is null or "notification_settings"."role_id" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "notification_settings_template_check" CHECK (length("notification_settings"."template") between 1 and 1500),
	CONSTRAINT "notification_settings_version_check" CHECK ("notification_settings"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "notification_test_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"request_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_test_status_check" CHECK ("notification_test_attempts"."status" in ('pending','sent','failed','uncertain'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "streamer_subscriptions_guild_id_idx" ON "streamer_subscriptions" USING btree ("guild_id","id");
--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_guild_id_subscription_id_streamer_subscriptions_guild_id_id_fk" FOREIGN KEY ("guild_id","subscription_id") REFERENCES "public"."streamer_subscriptions"("guild_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_settings_guild_idx" ON "notification_settings" USING btree ("guild_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_test_guild_request_idx" ON "notification_test_attempts" USING btree ("guild_id","request_id");--> statement-breakpoint
CREATE INDEX "notification_test_guild_created_idx" ON "notification_test_attempts" USING btree ("guild_id","created_at");--> statement-breakpoint
