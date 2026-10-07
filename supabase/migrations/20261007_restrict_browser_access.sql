-- Deploy the server-authenticated application with its server-only credentials FIRST.
-- Closing these grants before deploying it will stop the legacy browser application.
-- No business records are changed or deleted.
BEGIN;

DO $$
DECLARE
  table_name text;
  policy_record record;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'projects', 'performers', 'plans', 'plan_performers',
    'schedule_items', 'proposals', 'after_party_attendances', 'keepalive'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'Expected application table is missing: %', table_name;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated, PUBLIC', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', table_name);
    FOR policy_record IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy_record.policyname, table_name);
    END LOOP;
  END LOOP;
END $$;

-- The trigger is not intended to resolve objects using an attacker-controlled schema.
DO $$ BEGIN
  IF to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
    ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
  END IF;
END $$;
COMMIT;
