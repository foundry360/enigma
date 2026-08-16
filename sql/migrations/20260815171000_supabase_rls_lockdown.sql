-- PostgREST exposes the public schema. Enigma uses Prisma as the table owner,
-- so RLS without FORCE still allows the app while denying anon/authenticated.
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "Tenant" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "User" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "Organization" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "PlatformConnection" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "Assessment" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE "AuditLog" FROM anon, authenticated, PUBLIC;
