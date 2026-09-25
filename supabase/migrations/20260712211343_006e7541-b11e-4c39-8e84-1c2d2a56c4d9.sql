
-- 1. Grant SELECT on the public view
GRANT SELECT ON public.events_public TO anon, authenticated;

-- 2. Column-level SELECT on base events for anon (non-PII only)
GRANT SELECT (
  id, organizer_id, status, path, title, description, host_org, image_url,
  week, track, format, region, city, venue, address, starts_at, ends_at,
  capacity, cost_cents, external_url, topics, audience, published_at,
  created_at, updated_at, summary, host_url, host_org_type, host_logo_url
) ON public.events TO anon;

-- 3. RLS policy: anon can SELECT approved events only
DROP POLICY IF EXISTS "Anon read approved events" ON public.events;
CREATE POLICY "Anon read approved events"
  ON public.events
  FOR SELECT
  TO anon
  USING (status = 'approved');

-- 4. Authenticated users also need to read approved events (for map/calendar)
DROP POLICY IF EXISTS "Authenticated read approved events" ON public.events;
CREATE POLICY "Authenticated read approved events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (status = 'approved');
