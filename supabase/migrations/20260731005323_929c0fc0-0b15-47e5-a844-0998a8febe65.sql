CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DO $do$
DECLARE
  r record;
  v_using text;
  v_check text;
  v_sql text;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname,
           c.relname AS tablename,
           pol.polname AS policyname,
           pol.polcmd AS cmd,
           pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
           pg_get_expr(pol.polwithcheck, pol.polrelid) AS check_expr,
           (SELECT string_agg(quote_ident(pg_get_userbyid(x)), ', ')
              FROM unnest(pol.polroles) AS x) AS roles
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname IN ('public', 'storage')
    WHERE coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') LIKE '%has_role(%'
       OR coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') LIKE '%has_role(%'
  LOOP
    v_using := replace(coalesce(r.using_expr, ''), 'has_role(', 'private.has_role(');
    v_check := replace(coalesce(r.check_expr, ''), 'has_role(', 'private.has_role(');

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    v_sql := format('CREATE POLICY %I ON %I.%I FOR %s TO %s',
      r.policyname,
      r.schemaname,
      r.tablename,
      CASE r.cmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
      coalesce(r.roles, 'public'));

    IF r.using_expr IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', v_using);
    END IF;
    IF r.check_expr IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
    END IF;

    EXECUTE v_sql;
  END LOOP;
END
$do$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);