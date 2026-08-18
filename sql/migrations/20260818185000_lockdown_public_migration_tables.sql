-- Leftover / bookkeeping tables in public were created without RLS.
-- Supabase default privileges also grant anon and authenticated full access
-- to every new public table, which is what the advisor flags as
-- rls_disabled_in_public.

ALTER TABLE IF EXISTS schema_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE schema_migrations FROM anon, authenticated, PUBLIC;

ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated, PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
