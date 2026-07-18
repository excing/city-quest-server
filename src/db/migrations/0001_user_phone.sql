-- Callers: drizzle-kit migrate / manual apply on Neon.
-- Schema: users.phone for profile edit (format-only, no SMS verify).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;
