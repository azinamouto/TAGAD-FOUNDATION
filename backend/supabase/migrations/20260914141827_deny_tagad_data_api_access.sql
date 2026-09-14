-- Express/Prisma owns application authorization. Data API clients must not
-- access canonical tables, even if privileges are accidentally granted later.
-- Existing policies are preserved; a restrictive policy cannot widen access.
DO $migration$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND left(c.relname, 6) = 'tagad_'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target.relname);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', target.relname);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = target.relname AND policyname = 'tagad_deny_data_api') THEN
      EXECUTE format('CREATE POLICY tagad_deny_data_api ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', target.relname);
    END IF;
  END LOOP;
END
$migration$;
