CREATE TABLE "provider_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text NOT NULL,
	"canonical_url" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_channels_provider_check" CHECK ("provider_channels"."provider" in ('youtube', 'kick')),
	CONSTRAINT "provider_channels_id_check" CHECK (length("provider_channels"."external_id") between 1 and 128)
);
--> statement-breakpoint
CREATE TABLE "streamer_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"provider_channel_id" text NOT NULL,
	"user_identifier" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "streamer_subscriptions_guild_check" CHECK ("streamer_subscriptions"."guild_id" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "streamer_subscriptions_identifier_check" CHECK (length("streamer_subscriptions"."user_identifier") between 1 and 512)
);
--> statement-breakpoint
ALTER TABLE "streamer_subscriptions" ADD CONSTRAINT "streamer_subscriptions_provider_channel_id_provider_channels_id_fk" FOREIGN KEY ("provider_channel_id") REFERENCES "public"."provider_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_channels_identity_idx" ON "provider_channels" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "provider_channels_expiry_idx" ON "provider_channels" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "streamer_subscriptions_guild_source_idx" ON "streamer_subscriptions" USING btree ("guild_id","provider_channel_id");--> statement-breakpoint
CREATE INDEX "streamer_subscriptions_source_idx" ON "streamer_subscriptions" USING btree ("provider_channel_id");