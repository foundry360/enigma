-- Switch Enigma users to Supabase Auth. Existing password hashes cannot be reused.
DELETE FROM "AuditLog";
DELETE FROM "User";

ALTER TABLE "User" DROP COLUMN "passwordHash";
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
