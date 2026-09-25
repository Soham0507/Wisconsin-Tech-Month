-- Fix PII exposure: remove public RLS policy on base events table,
-- route public reads through the events_public view (which excludes host contact PII and admin_note),
-- and switch the view to run with owner privileges so anon/authenticated can read approved events
-- without any policy on the base table exposing host_email/host_contact_*.

DROP POLICY IF EXISTS "Public read approved events (safe cols)" ON public.events;

ALTER VIEW public.events_public SET (security_invoker = false);

GRANT SELECT ON public.events_public TO anon, authenticated;