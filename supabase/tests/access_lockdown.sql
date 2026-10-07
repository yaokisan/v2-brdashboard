-- Run after the migration, with a database owner connection. Read-only assertions.
BEGIN;
DO $$
DECLARE tbl text; db_role text; operation text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['projects','performers','plans','plan_performers','schedule_items','proposals','after_party_attendances','keepalive'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I', tbl)::regclass) THEN
      RAISE EXCEPTION 'RLS is disabled: %', tbl;
    END IF;
    FOREACH db_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      FOREACH operation IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
        IF has_table_privilege(db_role, format('public.%I', tbl), operation) THEN
          RAISE EXCEPTION 'Unexpected privilege: % % %', db_role, tbl, operation;
        END IF;
      END LOOP;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=tbl) THEN
      RAISE EXCEPTION 'Unexpected browser policy: %', tbl;
    END IF;
    FOREACH operation IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      IF NOT has_table_privilege('service_role', format('public.%I', tbl), operation) THEN
        RAISE EXCEPTION 'Server privilege missing: % %', tbl, operation;
      END IF;
    END LOOP;
  END LOOP;
END $$;
ROLLBACK;
