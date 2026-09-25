
-- 1. Events: resubmission + admin note
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS resubmitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- Admin delete policy (was missing)
DROP POLICY IF EXISTS "Admins delete all events" ON public.events;
CREATE POLICY "Admins delete all events" ON public.events
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. page_views
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  session_id TEXT NOT NULL,
  referrer TEXT,
  user_id UUID,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_views_viewed_at_idx ON public.page_views (viewed_at DESC);
CREATE INDEX IF NOT EXISTS page_views_path_viewed_at_idx ON public.page_views (path, viewed_at DESC);
CREATE INDEX IF NOT EXISTS page_views_session_idx ON public.page_views (session_id, path, viewed_at DESC);

GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Anyone can insert page views" ON public.page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read page views" ON public.page_views;
CREATE POLICY "Admins read page views" ON public.page_views
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
