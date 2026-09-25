-- Prevent public/authenticated roles from selecting host PII columns on the base events table.
-- Public browsing continues via the public events view; admin/organizer server functions switch to service-role reads.

REVOKE SELECT ON public.events FROM anon, authenticated;

GRANT SELECT (
  id, organizer_id, status, path, title, description, host_org, image_url,
  week, track, format, region, city, venue, address, starts_at, ends_at,
  capacity, cost_cents, external_url, topics, audience, published_at,
  created_at, updated_at, resubmitted_at, host_url, host_org_type, summary,
  host_logo_url
) ON public.events TO anon, authenticated;

-- Keep write privileges for organizers/admins
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

-- Ensure the public view stays reachable
GRANT SELECT ON public.events_public TO anon, authenticated;

-- Allow registrants to read their own registration row
CREATE POLICY "Registrants read own registration"
  ON public.event_registrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);