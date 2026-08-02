-- 1) Revoke public/anon/authenticated EXECUTE on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_practice_reminders() FROM PUBLIC, anon, authenticated;

-- keep server-side/internal execution paths working
GRANT EXECUTE ON FUNCTION public.send_practice_reminders() TO service_role;

-- 2) Owner-scoped DELETE policy for notification_prefs
DROP POLICY IF EXISTS "Users can delete their own notification prefs" ON public.notification_prefs;
CREATE POLICY "Users can delete their own notification prefs"
ON public.notification_prefs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
