-- Callers: drizzle-kit migrate / manual apply on Neon.
-- Schema: users, encyclopedias, favorites (see src/db/schema.ts).
-- User: 阅读 @docs , 然后选择合适的agents或skills, 开始进行开发.

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "openid" text NOT NULL,
  "nickname" text,
  "avatar_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_openid_uidx" ON "users" USING btree ("openid");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encyclopedias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "type_key" text NOT NULL,
  "lng" double precision NOT NULL,
  "lat" double precision NOT NULL,
  "intro" text NOT NULL,
  "address" text,
  "business_hours" text,
  "avg_price" text,
  "phone" text,
  "status" text NOT NULL,
  "images" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encyclopedias_status_idx" ON "encyclopedias" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encyclopedias_updated_at_idx" ON "encyclopedias" USING btree ("updated_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "favorites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "encyclopedia_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "favorites" ADD CONSTRAINT "favorites_encyclopedia_id_encyclopedias_id_fk"
    FOREIGN KEY ("encyclopedia_id") REFERENCES "public"."encyclopedias"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "favorites_user_encyclopedia_uidx"
  ON "favorites" USING btree ("user_id","encyclopedia_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "favorites_user_created_idx"
  ON "favorites" USING btree ("user_id","created_at");
