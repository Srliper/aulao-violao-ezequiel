ALTER TABLE public.notification_prefs ADD COLUMN IF NOT EXISTS notify_practice boolean NOT NULL DEFAULT true;
ALTER TABLE public.push_devices ADD COLUMN IF NOT EXISTS notify_practice boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.send_practice_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer;
  today_local date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  WITH targets AS (
    SELECT p.id AS user_id
    FROM public.profiles p
    LEFT JOIN public.notification_prefs np ON np.user_id = p.id
    WHERE COALESCE(np.notify_practice, true)
      AND NOT EXISTS (
        SELECT 1 FROM public.practice_logs pl
        WHERE pl.user_id = p.id AND pl.practice_date = today_local
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = p.id
          AND n.link = '/pratica'
          AND n.created_at > now() - interval '20 hours'
      )
  ), ins AS (
    INSERT INTO public.notifications (user_id, title, body, link)
    SELECT user_id,
           'Hora de praticar 🎸',
           'Registre hoje no seu Diário de Prática para manter a sequência.',
           '/pratica'
    FROM targets
    RETURNING 1
  )
  SELECT count(*)::int INTO inserted FROM ins;
  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.send_practice_reminders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_practice_reminders() FROM anon;
REVOKE ALL ON FUNCTION public.send_practice_reminders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.send_practice_reminders() TO service_role;