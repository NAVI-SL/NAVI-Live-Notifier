CREATE TABLE "live_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"settings_version" integer NOT NULL,
	"status" text NOT NULL,
	"error_code" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_delivery_status_check" CHECK ("live_deliveries"."status" in ('pending','sending','sent','suppressed','failed','uncertain'))
);
--> statement-breakpoint
CREATE TABLE "monitor_limits" (
	"provider" text PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"blocked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "monitor_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitor_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitor_sources" (
	"source_id" text PRIMARY KEY NOT NULL,
	"initialized" boolean DEFAULT false NOT NULL,
	"next_poll" timestamp with time zone DEFAULT now() NOT NULL,
	"discover_after" timestamp with time zone DEFAULT now() NOT NULL,
	"candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"renew_after" timestamp with time zone DEFAULT now() NOT NULL,
	"upstream_id" text,
	"hub_pending" boolean DEFAULT false NOT NULL,
	"hub_expires" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "live_deliveries" ADD CONSTRAINT "live_deliveries_session_id_monitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."monitor_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitor_sessions" ADD CONSTRAINT "monitor_sessions_source_id_provider_channels_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."provider_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitor_sources" ADD CONSTRAINT "monitor_sources_source_id_provider_channels_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."provider_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "live_delivery_destination_once" ON "live_deliveries" USING btree ("session_id","guild_id","channel_id");--> statement-breakpoint
CREATE INDEX "live_delivery_due_idx" ON "live_deliveries" USING btree ("status","due_at");