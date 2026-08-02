CREATE POLICY "Staff can view notification prefs"
ON public.notification_prefs FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Staff can insert notification prefs"
ON public.notification_prefs FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Staff can update notification prefs"
ON public.notification_prefs FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));