CREATE TABLE public.practice_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  minutes integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, practice_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_logs TO authenticated;
GRANT ALL ON public.practice_logs TO service_role;
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practice_own_all" ON public.practice_logs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "practice_staff_read" ON public.practice_logs FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));
CREATE TRIGGER practice_logs_updated_at BEFORE UPDATE ON public.practice_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date date,
  class_time text,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  repertoire_id uuid REFERENCES public.repertoire(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_student_read" ON public.assignments FOR SELECT TO authenticated USING (
  assignee_id = auth.uid()
  OR (assignee_id IS NULL AND (class_time IS NULL OR class_time = (SELECT class_time FROM public.profiles WHERE id = auth.uid())))
  OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor')
);
CREATE POLICY "assignments_staff_insert" ON public.assignments FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));
CREATE POLICY "assignments_staff_update" ON public.assignments FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));
CREATE POLICY "assignments_staff_delete" ON public.assignments FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));
CREATE TRIGGER assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.assignment_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_completions TO authenticated;
GRANT ALL ON public.assignment_completions TO service_role;
ALTER TABLE public.assignment_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions_own_all" ON public.assignment_completions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "completions_staff_read" ON public.assignment_completions FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));