-- 1. students: leitura restrita a admin/mentor
DROP POLICY IF EXISTS students_read_authenticated ON public.students;
CREATE POLICY students_read_staff ON public.students FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));

-- 2. roster_attendance: leitura restrita a admin/mentor
DROP POLICY IF EXISTS roster_attendance_read_authenticated ON public.roster_attendance;
CREATE POLICY roster_attendance_read_staff ON public.roster_attendance FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));

-- 3. Não expor created_by nas tabelas de leitura ampla
REVOKE SELECT ON public.gallery_photos FROM authenticated;
GRANT SELECT (id, title, caption, image_path, event_date, sort_order, created_at) ON public.gallery_photos TO authenticated;

REVOKE SELECT ON public.repertoire FROM authenticated;
GRANT SELECT (id, title, artist, level, notes, video_url, class_time, sort_order, created_at, updated_at) ON public.repertoire TO authenticated;

REVOKE SELECT ON public.class_schedule FROM authenticated;
GRANT SELECT (id, class_date, class_time, will_happen, note, created_at, updated_at) ON public.class_schedule TO authenticated;

-- 4. Funções SECURITY DEFINER não devem ser chamáveis pela API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;