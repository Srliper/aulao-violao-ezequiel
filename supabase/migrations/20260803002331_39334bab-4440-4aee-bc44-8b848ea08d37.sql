CREATE TABLE public.student_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  email text,
  class_time text NOT NULL DEFAULT '14:30',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  used_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_invites TO authenticated;
GRANT ALL ON public.student_invites TO service_role;

ALTER TABLE public.student_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_read_admin" ON public.student_invites FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "invites_insert_admin" ON public.student_invites FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());
CREATE POLICY "invites_update_admin" ON public.student_invites FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "invites_delete_admin" ON public.student_invites FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER student_invites_set_updated_at BEFORE UPDATE ON public.student_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();