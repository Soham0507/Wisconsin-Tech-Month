ALTER TABLE public.events ADD COLUMN IF NOT EXISTS featured_home boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS events_featured_home_idx ON public.events (featured_home) WHERE featured_home = true;

GRANT SELECT (featured_home) ON public.events TO anon, authenticated;

DROP VIEW IF EXISTS public.events_public;
CREATE VIEW public.events_public
WITH (security_invoker=true) AS
SELECT id, organizer_id, status, path, title, description, host_org, image_url,
       week, track, format, region, city, venue, address, starts_at, ends_at,
       capacity, cost_cents, external_url, topics, audience, published_at,
       created_at, updated_at, summary, host_url, host_org_type, host_logo_url,
       featured, featured_home
  FROM public.events
 WHERE status = 'approved'::event_status;

GRANT SELECT ON public.events_public TO anon, authenticated;