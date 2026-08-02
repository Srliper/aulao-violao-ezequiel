ALTER TABLE public.notification_prefs
  ADD COLUMN IF NOT EXISTS practice_reminder_hour integer NOT NULL DEFAULT 19,
  ADD COLUMN IF NOT EXISTS practice_reminder_days integer[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6];

CREATE OR REPLACE FUNCTION public.validate_practice_reminder_prefs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.practice_reminder_hour < 0 OR NEW.practice_reminder_hour > 23 THEN
    RAISE EXCEPTION 'practice_reminder_hour deve estar entre 0 e 23';
  END IF;
  IF NEW.practice_reminder_days IS NULL OR array_length(NEW.practice_reminder_days, 1) IS NULL THEN
    RAISE EXCEPTION 'practice_reminder_days precisa de pelo menos um dia';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(NEW.practice_reminder_days) d WHERE d < 0 OR d > 6) THEN
    RAISE EXCEPTION 'practice_reminder_days aceita apenas valores de 0 a 6';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_practice_reminder_prefs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_practice_reminder_prefs() FROM anon;
REVOKE ALL ON FUNCTION public.validate_practice_reminder_prefs() FROM authenticated;

DROP TRIGGER IF EXISTS validate_practice_reminder_prefs ON public.notification_prefs;
CREATE TRIGGER validate_practice_reminder_prefs
BEFORE INSERT OR UPDATE ON public.notification_prefs
FOR EACH ROW EXECUTE FUNCTION public.validate_practice_reminder_prefs();

CREATE OR REPLACE FUNCTION public.send_practice_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer;
  local_now timestamp := (now() AT TIME ZONE 'America/Sao_Paulo');
  today_local date := local_now::date;
  hour_local integer := extract(hour from local_now)::int;
  dow_local integer := extract(dow from local_now)::int;
BEGIN
  WITH targets AS (
    SELECT p.id AS user_id
    FROM public.profiles p
    LEFT JOIN public.notification_prefs np ON np.user_id = p.id
    WHERE COALESCE(np.notify_practice, true)
      AND COALESCE(np.practice_reminder_hour, 19) = hour_local
      AND dow_local = ANY (COALESCE(np.practice_reminder_days, ARRAY[0,1,2,3,4,5,6]))
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