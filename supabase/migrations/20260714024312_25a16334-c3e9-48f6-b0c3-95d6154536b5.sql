
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS events_featured_week_idx ON public.events (week, featured) WHERE featured = true;
GRANT SELECT (featured) ON public.events TO anon, authenticated;
