-- Revoke EXECUTE from anon/authenticated/PUBLIC on SECURITY DEFINER trigger
-- functions that should only be invoked by the database trigger system,
-- never called directly from the Data API.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_pending_admin_invite() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role() is intentionally callable by authenticated users because RLS
-- policies invoke it as the querying role; leave its EXECUTE grant intact.

-- Tighten event_registrations: add owner-scoped UPDATE/DELETE policies so
-- registrants can manage their own RSVPs and organizers/admins can clean up,
-- rather than leaving those verbs uncovered.

DROP POLICY IF EXISTS "Registrants can update their own registration" ON public.event_registrations;
CREATE POLICY "Registrants can update their own registration"
ON public.event_registrations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Registrants and organizers can delete registrations" ON public.event_registrations;
CREATE POLICY "Registrants and organizers can delete registrations"
ON public.event_registrations
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_registrations.event_id
      AND e.organizer_id = auth.uid()
  )
);
