
CREATE TABLE public.contact_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('whatsapp','phone')),
  source text NOT NULL DEFAULT 'home',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.contact_clicks TO anon, authenticated;
GRANT SELECT ON public.contact_clicks TO authenticated;
GRANT ALL ON public.contact_clicks TO service_role;

ALTER TABLE public.contact_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_clicks_insert_anyone
  ON public.contact_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(coalesce(user_agent,'')) <= 500
    AND length(source) <= 60
  );

CREATE POLICY contact_clicks_select_admin
  ON public.contact_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX contact_clicks_created_at_idx ON public.contact_clicks (created_at DESC);
CREATE INDEX contact_clicks_channel_idx ON public.contact_clicks (channel);
