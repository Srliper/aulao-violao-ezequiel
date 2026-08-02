-- Add class_time to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS class_time text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_class_time_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_class_time_check
  CHECK (class_time IS NULL OR class_time IN ('13:00', '14:30'));

-- Update handle_new_user to store class_time from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, class_time)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'class_time', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$function$;

-- Allow admins to read all user_roles so the admin dashboard can list students
DROP POLICY IF EXISTS roles_admin_read_all ON public.user_roles;
CREATE POLICY roles_admin_read_all
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));