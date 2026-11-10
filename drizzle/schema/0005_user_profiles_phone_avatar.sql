-- Add phone and avatar_url columns to UserProfiles
ALTER TABLE "core"."UserProfiles" ADD COLUMN IF NOT EXISTS "Phone" text;
ALTER TABLE "core"."UserProfiles" ADD COLUMN IF NOT EXISTS "AvatarUrl" text;

-- Add index for phone lookups
CREATE INDEX IF NOT EXISTS "UserProfiles_Phone_idx" ON "core"."UserProfiles" ("Phone");
