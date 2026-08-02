CREATE TABLE public.repertoire (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  level text,
  notes text,
  video_url text,
  class_time text,
  sort_order integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repertoire TO authenticated;
GRANT ALL ON public.repertoire TO service_role;
ALTER TABLE public.repertoire ENABLE ROW LEVEL SECURITY;
CREATE POLICY repertoire_read_authenticated ON public.repertoire FOR SELECT TO authenticated USING (true);
CREATE POLICY repertoire_insert_admin ON public.repertoire FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY repertoire_update_admin ON public.repertoire FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY repertoire_delete_admin ON public.repertoire FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER repertoire_set_updated_at BEFORE UPDATE ON public.repertoire FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  title text,
  caption text,
  image_path text not null,
  event_date date,
  sort_order integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_photos TO authenticated;
GRANT ALL ON public.gallery_photos TO service_role;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY gallery_read_authenticated ON public.gallery_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY gallery_insert_admin ON public.gallery_photos FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY gallery_update_admin ON public.gallery_photos FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY gallery_delete_admin ON public.gallery_photos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));