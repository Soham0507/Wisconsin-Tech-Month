-- Restrict profiles: drop public read, add owner-only read.
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Tighten page_views insert: replace WITH CHECK (true) with input validation.
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Anyone can insert page views"
ON public.page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  path IS NOT NULL
  AND length(path) BETWEEN 1 AND 2048
  AND left(path, 1) = '/'
  AND session_id IS NOT NULL
  AND length(session_id) BETWEEN 1 AND 128
  AND (referrer IS NULL OR length(referrer) <= 2048)
  AND (user_id IS NULL OR user_id = auth.uid())
);
