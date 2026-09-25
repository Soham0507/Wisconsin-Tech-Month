
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- has_role must remain callable by authenticated (used in RLS via SECURITY DEFINER, but also called
-- directly by app code); RLS still gates data access.
