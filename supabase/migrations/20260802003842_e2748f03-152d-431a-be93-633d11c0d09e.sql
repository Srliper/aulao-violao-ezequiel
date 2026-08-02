DROP POLICY IF EXISTS roles_admin_rows_visible ON public.user_roles;

CREATE OR REPLACE FUNCTION public.get_teacher_contacts()
RETURNS TABLE (user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id, p.full_name
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin'::app_role
    AND auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.get_teacher_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_contacts() TO authenticated;