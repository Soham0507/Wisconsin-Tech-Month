
-- Pending admin invites (email-based, applied on signup)
CREATE TABLE public.pending_admin_invites (
  email text PRIMARY KEY,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_admin_invites TO authenticated;
GRANT ALL ON public.pending_admin_invites TO service_role;

ALTER TABLE public.pending_admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invites"
  ON public.pending_admin_invites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create invites"
  ON public.pending_admin_invites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invites"
  ON public.pending_admin_invites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: when a new user signs up whose email is invited, grant admin
CREATE OR REPLACE FUNCTION public.apply_pending_admin_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pending_admin_invites WHERE lower(email) = lower(NEW.email)
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.pending_admin_invites WHERE lower(email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_apply_admin_invite
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.apply_pending_admin_invite();

-- Also re-run handle_new_user (profile creation) trigger, which currently has no trigger attached
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bootstrap: grant briana.wilder@ymail.com admin now if the account exists,
-- otherwise queue the invite so signup grants automatically.
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower('briana.wilder@ymail.com') LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.pending_admin_invites (email)
    VALUES ('briana.wilder@ymail.com')
    ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;
