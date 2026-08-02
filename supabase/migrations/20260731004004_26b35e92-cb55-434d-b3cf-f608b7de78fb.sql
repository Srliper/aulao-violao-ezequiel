CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  class_time text NOT NULL DEFAULT '14:30',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY students_read_authenticated ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY students_insert_admin ON public.students FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY students_update_admin ON public.students FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY students_delete_admin ON public.students FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER students_set_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.roster_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_date date NOT NULL,
  class_time text NOT NULL DEFAULT '14:30',
  status public.attendance_status NOT NULL DEFAULT 'present',
  justification text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_date, class_time)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roster_attendance TO authenticated;
GRANT ALL ON public.roster_attendance TO service_role;
ALTER TABLE public.roster_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY roster_attendance_read_authenticated ON public.roster_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY roster_attendance_insert_admin ON public.roster_attendance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY roster_attendance_update_admin ON public.roster_attendance FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY roster_attendance_delete_admin ON public.roster_attendance FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));