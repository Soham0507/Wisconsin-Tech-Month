
-- Switch events_public to security_invoker so it respects the querying user's
-- RLS and column privileges (fixes SUPA_security_definer_view).
ALTER VIEW public.events_public SET (security_invoker = true);

-- Grant SELECT on only the safe (non-PII) columns of events to anon/authenticated
-- so the invoker-based view can serve public reads without exposing host contact PII.
GRANT SELECT (
  id, organizer_id, status, path, title, description, host_org, image_url,
  week, track, format, region, city, venue, address, starts_at, ends_at,
  capacity, cost_cents, external_url, topics, audience, published_at,
  created_at, updated_at, summary, host_url, host_org_type, host_logo_url
) ON public.events TO anon, authenticated;

-- Add a narrow RLS SELECT policy allowing anyone to read approved events.
-- Column privileges above continue to hide the PII columns from anon/authenticated.
DROP POLICY IF EXISTS "Public read approved events" ON public.events;
CREATE POLICY "Public read approved events"
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved'::event_status);
