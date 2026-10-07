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
-- Verify effective grants before committing any permission changes.
DO $check_permissions$
DECLARE
 t record;
 r record;
 target_count integer := 0;
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated','service_role')) <> 3 THEN
   RAISE EXCEPTION 'Required API roles are missing';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role' AND (rolbypassrls OR rolsuper)) THEN
   RAISE EXCEPTION 'service_role must bypass RLS for this server-only access design';
 END IF;
 FOR t IN
   SELECT c.oid, c.relname, c.relrowsecurity, c.relkind
   FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname IN (
    'projects','performers','plans','plan_performers','schedule_items','proposals','after_party_attendances','keepalive')
 LOOP
   target_count := target_count + 1;
   IF t.relkind NOT IN ('r','p') OR NOT t.relrowsecurity THEN
     RAISE EXCEPTION 'Expected an RLS-enabled table: %', t.relname;
   END IF;
   IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy p WHERE p.polrelid = t.oid) THEN
     RAISE EXCEPTION 'Unexpected remaining policy: %', t.relname;
   END IF;
   FOR r IN SELECT oid, rolname FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated') LOOP
     IF pg_catalog.has_table_privilege(r.oid, t.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       OR pg_catalog.has_any_column_privilege(r.oid, t.oid, 'SELECT,INSERT,UPDATE,REFERENCES') THEN
       RAISE EXCEPTION 'Effective table/column grants still exist: role %, table %', r.rolname, t.relname;
     END IF;
   END LOOP;
   IF NOT (pg_catalog.has_schema_privilege('service_role','public','USAGE')
     AND pg_catalog.has_table_privilege('service_role',t.oid,'SELECT')
     AND pg_catalog.has_table_privilege('service_role',t.oid,'INSERT')
     AND pg_catalog.has_table_privilege('service_role',t.oid,'UPDATE')
     AND pg_catalog.has_table_privilege('service_role',t.oid,'DELETE')) THEN
     RAISE EXCEPTION 'Server-role access is incomplete: %', t.relname;
   END IF;
 END LOOP;
 IF target_count <> 8 THEN RAISE EXCEPTION 'Expected 8 tables, found %', target_count; END IF;
END $check_permissions$;
COMMIT;
