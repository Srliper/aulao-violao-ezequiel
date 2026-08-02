
-- 1. Restrict EXECUTE on has_role: revoke from public/anon; keep for authenticated (needed by RLS) and service_role.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 2. mentorship_sessions: replace ALL policy with granular ones. Mentors can insert/update their sessions; only admins can delete.
DROP POLICY IF EXISTS sessions_write_mentor_or_admin ON public.mentorship_sessions;

CREATE POLICY sessions_insert_mentor_or_admin ON public.mentorship_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.mentorships m WHERE m.id = mentorship_id AND m.mentor_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY sessions_update_mentor_or_admin ON public.mentorship_sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.mentorships m WHERE m.id = mentorship_id AND m.mentor_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.mentorships m WHERE m.id = mentorship_id AND m.mentor_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY sessions_delete_admin_only ON public.mentorship_sessions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. user_roles: add explicit admin-only write policies. Signups still work via SECURITY DEFINER trigger handle_new_user.
CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
