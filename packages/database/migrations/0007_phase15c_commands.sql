CREATE TABLE "bot_command_attempts" (
	"command_id" text NOT NULL,
	"generation" integer NOT NULL,
	"owner" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"effect_started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error_code" text,
	"channel_id" text,
	"message_id" text,
	CONSTRAINT "bot_command_attempts_command_id_generation_pk" PRIMARY KEY("command_id","generation"),
	CONSTRAINT "bot_attempt_generation" CHECK ("bot_command_attempts"."generation">0)
);
--> statement-breakpoint
CREATE TABLE "bot_commands" (
	"id" text PRIMARY KEY NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"kind" text NOT NULL,
	"guild_id" text NOT NULL,
	"requester_user_id" text NOT NULL,
	"requester_discord_id" text NOT NULL,
	"session_ref" text NOT NULL,
	"subscription_id" text,
	"expected_version" integer,
	"idempotency_key" text NOT NULL,
	"payload_hash" text NOT NULL,
	"policy_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"lease_owner" text,
	"lease_generation" integer DEFAULT 0 NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"effect_started_at" timestamp with time zone,
	"result" jsonb,
	"error_code" text,
	"retry_after_seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "bot_command_kind" CHECK ("bot_commands"."kind" in ('guild_status.refresh','notification_targets.refresh','notification_settings.apply','notification_test.send')),
	CONSTRAINT "bot_command_status" CHECK ("bot_commands"."status" in ('pending','processing','completed','failed','expired','cancelled','uncertain')),
	CONSTRAINT "bot_command_shape" CHECK ("bot_commands"."schema_version"=1 and jsonb_typeof("bot_commands"."payload")='object' and octet_length("bot_commands"."payload"::text)<=12000 and ("bot_commands"."result" is null or octet_length("bot_commands"."result"::text)<=1048576)),
	CONSTRAINT "bot_command_bounds" CHECK ("bot_commands"."attempt_count" between 0 and 3 and "bot_commands"."retry_count" between 0 and 2 and "bot_commands"."max_attempts"=3 and "bot_commands"."lease_generation">=0 and "bot_commands"."retry_after_seconds">=0 and "bot_commands"."expires_at">"bot_commands"."created_at"),
	CONSTRAINT "bot_command_identity" CHECK ("bot_commands"."guild_id" ~ '^[0-9]{17,20}$' and "bot_commands"."requester_discord_id" ~ '^[0-9]{17,20}$' and "bot_commands"."id" ~* '^[a-f0-9-]{36}$' and "bot_commands"."idempotency_key" ~* '^[a-f0-9-]{36}$' and "bot_commands"."payload_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "bot_command_ownership" CHECK ("bot_commands"."status"<>'processing' or ("bot_commands"."lease_owner" is not null and "bot_commands"."lease_expires_at" is not null)),
	CONSTRAINT "bot_command_result" CHECK (("bot_commands"."status"='completed') = ("bot_commands"."result" is not null))
);
--> statement-breakpoint
CREATE TABLE "bot_guild_snapshots" (
	"guild_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stale_after" timestamp with time zone NOT NULL,
	"generation" integer NOT NULL,
	CONSTRAINT "bot_guild_snapshots_guild_id_kind_pk" PRIMARY KEY("guild_id","kind"),
	CONSTRAINT "bot_snapshot_size" CHECK (octet_length("bot_guild_snapshots"."payload"::text)<=1048576)
);
--> statement-breakpoint
ALTER TABLE "bot_command_attempts" ADD CONSTRAINT "bot_command_attempts_command_id_bot_commands_id_fk" FOREIGN KEY ("command_id") REFERENCES "public"."bot_commands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bot_command_idempotency" ON "bot_commands" USING btree ("guild_id","kind","idempotency_key");--> statement-breakpoint
CREATE INDEX "bot_command_due" ON "bot_commands" USING btree ("due_at","created_at","id") WHERE "bot_commands"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "bot_command_lease" ON "bot_commands" USING btree ("lease_expires_at") WHERE "bot_commands"."status" = 'processing';--> statement-breakpoint
CREATE INDEX "bot_command_expiry" ON "bot_commands" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "bot_command_actor" ON "bot_commands" USING btree ("guild_id","requester_user_id","id");
--> statement-breakpoint
-- No token/cookie columns leave this function. Explicit EXECUTE grants are required.
CREATE FUNCTION "public"."navi_command_requester_valid"(session_ref text, user_ref text, discord_ref text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, "public"
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "public"."auth_session" s
    JOIN "public"."auth_user" u ON u.id=s.user_id
    JOIN "public"."auth_account" a ON a.user_id=u.id
    WHERE s.id=session_ref AND u.id=user_ref AND s.expires_at>clock_timestamp()
      AND u.email='discord-' || discord_ref || '@users.navi.invalid'
      AND a.provider_id='discord' AND a.account_id=discord_ref
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."navi_command_requester_valid"(text,text,text) FROM PUBLIC;
--> statement-breakpoint
CREATE FUNCTION "public"."navi_command_immutable"() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, "public" AS $$
BEGIN
  IF (NEW.id,NEW.schema_version,NEW.kind,NEW.guild_id,NEW.requester_user_id,NEW.requester_discord_id,NEW.session_ref,NEW.subscription_id,NEW.expected_version,NEW.idempotency_key,NEW.payload_hash,NEW.policy_hash,NEW.payload,NEW.created_at,NEW.expires_at,NEW.max_attempts)
    IS DISTINCT FROM
    (OLD.id,OLD.schema_version,OLD.kind,OLD.guild_id,OLD.requester_user_id,OLD.requester_discord_id,OLD.session_ref,OLD.subscription_id,OLD.expected_version,OLD.idempotency_key,OLD.payload_hash,OLD.policy_hash,OLD.payload,OLD.created_at,OLD.expires_at,OLD.max_attempts)
    OR (OLD.effect_started_at IS NOT NULL AND NEW.effect_started_at IS DISTINCT FROM OLD.effect_started_at)
    OR (OLD.status IN ('completed','failed','expired','cancelled','uncertain') AND NEW IS DISTINCT FROM OLD)
  THEN RAISE EXCEPTION 'immutable_command'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER bot_command_immutable BEFORE UPDATE ON "bot_commands"
FOR EACH ROW EXECUTE FUNCTION "public"."navi_command_immutable"();
--> statement-breakpoint
-- Preserve unresolved and command-linked test evidence even when legacy code prunes.
CREATE FUNCTION "public"."navi_retain_command_test"() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, "public" AS $$
BEGIN
  IF OLD.status IN ('pending','uncertain') OR EXISTS (
    SELECT 1 FROM "public"."bot_commands" c WHERE c.guild_id=OLD.guild_id
      AND c.kind='notification_test.send' AND c.idempotency_key=OLD.request_id
  ) THEN RETURN NULL; END IF;
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER retain_command_test BEFORE DELETE ON "notification_test_attempts"
FOR EACH ROW EXECUTE FUNCTION "public"."navi_retain_command_test"();
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."navi_command_immutable"() FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."navi_retain_command_test"() FROM PUBLIC;
