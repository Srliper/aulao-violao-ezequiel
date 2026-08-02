CREATE TABLE public.practice_reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Prática',
  discipline text,
  level text,
  scope_type text NOT NULL DEFAULT 'all',
  class_time text,
  student_id uuid,
  reminder_hour integer NOT NULL DEFAULT 19,
  reminder_days integer[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_reminder_rules TO authenticated;
GRANT ALL ON public.practice_reminder_rules TO service_role;

ALTER TABLE public.practice_reminder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage practice reminder rules"
ON public.practice_reminder_rules FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'))
WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));

CREATE POLICY "Students view own practice reminder rules"
ON public.practice_reminder_rules FOR SELECT TO authenticated
USING (
  scope_type = 'all'
  OR (scope_type = 'student' AND student_id = auth.uid())
  OR (scope_type = 'class' AND class_time IN (SELECT p.class_time FROM public.profiles p WHERE p.id = auth.uid()))
);

CREATE TRIGGER practice_reminder_rules_updated_at
BEFORE UPDATE ON public.practice_reminder_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_practice_reminder_rule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.scope_type NOT IN ('all','class','student') THEN
    RAISE EXCEPTION 'scope_type deve ser all, class ou student';
  END IF;
  IF NEW.scope_type = 'class' AND (NEW.class_time IS NULL OR NEW.class_time = '') THEN
    RAISE EXCEPTION 'informe a turma';
  END IF;
  IF NEW.scope_type = 'student' AND NEW.student_id IS NULL THEN
    RAISE EXCEPTION 'informe o aluno';
  END IF;
  IF NEW.reminder_hour < 0 OR NEW.reminder_hour > 23 THEN
    RAISE EXCEPTION 'reminder_hour deve estar entre 0 e 23';
  END IF;
  IF NEW.reminder_days IS NULL OR array_length(NEW.reminder_days, 1) IS NULL THEN
    RAISE EXCEPTION 'reminder_days precisa de pelo menos um dia';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(NEW.reminder_days) d WHERE d < 0 OR d > 6) THEN
    RAISE EXCEPTION 'reminder_days aceita apenas valores de 0 a 6';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_practice_reminder_rule() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER practice_reminder_rules_validate
BEFORE INSERT OR UPDATE ON public.practice_reminder_rules
FOR EACH ROW EXECUTE FUNCTION public.validate_practice_reminder_rule();

CREATE OR REPLACE FUNCTION public.send_practice_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer;
  rule_inserted integer;
  local_now timestamp := (now() AT TIME ZONE 'America/Sao_Paulo');
  today_local date := local_now::date;
  hour_local integer := extract(hour from local_now)::int;
  dow_local integer := extract(dow from local_now)::int;
BEGIN
  -- 1) lembrete pessoal (preferências do aluno)
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
          AND n.title = 'Hora de praticar 🎸'
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

  -- 2) lembretes por disciplina/nível (regras do professor)
  WITH rule_targets AS (
    SELECT r.id AS rule_id,
           p.id AS user_id,
           ('Praticar ' || COALESCE(NULLIF(r.discipline, ''), r.title)
             || CASE WHEN COALESCE(r.level, '') <> '' THEN ' · ' || r.level ELSE '' END) AS title
    FROM public.practice_reminder_rules r
    JOIN public.profiles p ON (
      r.scope_type = 'all'
      OR (r.scope_type = 'class' AND p.class_time = r.class_time)
      OR (r.scope_type = 'student' AND p.id = r.student_id)
    )
    LEFT JOIN public.notification_prefs np ON np.user_id = p.id
    WHERE r.enabled
      AND r.reminder_hour = hour_local
      AND dow_local = ANY (r.reminder_days)
      AND COALESCE(np.notify_practice, true)
  ), filtered AS (
    SELECT rt.* FROM rule_targets rt
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = rt.user_id
        AND n.link = '/pratica'
        AND n.title = rt.title
        AND n.created_at > now() - interval '20 hours'
    )
  ), ins2 AS (
    INSERT INTO public.notifications (user_id, title, body, link)
    SELECT user_id,
           title,
           'Lembrete do professor: registre esta prática no seu Diário de Prática.',
           '/pratica'
    FROM filtered
    RETURNING 1
  )
  SELECT count(*)::int INTO rule_inserted FROM ins2;

  RETURN inserted + rule_inserted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_practice_reminders() FROM PUBLIC, anon, authenticated;