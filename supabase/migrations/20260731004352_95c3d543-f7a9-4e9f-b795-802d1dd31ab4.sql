CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY dm_select_participants ON public.direct_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY dm_insert_sender ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND length(body) > 0 AND length(body) <= 2000 AND recipient_id <> auth.uid());
CREATE POLICY dm_update_recipient ON public.direct_messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY dm_delete_sender_or_admin ON public.direct_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX dm_pair_idx ON public.direct_messages (sender_id, recipient_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

CREATE TABLE public.class_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_date date NOT NULL,
  class_time text NOT NULL DEFAULT '14:30',
  will_happen boolean NOT NULL DEFAULT true,
  note text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (class_date, class_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_schedule TO authenticated;
GRANT ALL ON public.class_schedule TO service_role;
ALTER TABLE public.class_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY class_schedule_read_authenticated ON public.class_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY class_schedule_insert_admin ON public.class_schedule FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY class_schedule_update_admin ON public.class_schedule FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY class_schedule_delete_admin ON public.class_schedule FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER class_schedule_updated_at BEFORE UPDATE ON public.class_schedule FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();