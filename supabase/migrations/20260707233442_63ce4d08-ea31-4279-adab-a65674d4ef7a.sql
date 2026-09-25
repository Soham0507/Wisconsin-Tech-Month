
-- 1) Function search_path fixes for SECURITY DEFINER functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_temp;

-- 2) Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_pending_admin_invite() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3) PII exposure fix: drop broad public policy and replace with a safe view
DROP POLICY IF EXISTS "Public read approved events" ON public.events;

CREATE OR REPLACE VIEW public.events_public
WITH (security_invoker = true) AS
SELECT
  id, organizer_id, status, path, title, description, host_org,
  image_url, week, track, format, region, city, venue, address,
  starts_at, ends_at, capacity, cost_cents, external_url,
  topics, audience, published_at, created_at, updated_at, summary,
  host_url, host_org_type, host_logo_url
FROM public.events
WHERE status = 'approved';

-- Re-add a narrow row-level policy for the view to read from events (safe columns only via view)
CREATE POLICY "Public read approved events (safe cols)"
ON public.events
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- Column-level revoke: hide PII columns from anon/authenticated on the base table
REVOKE SELECT (host_email, host_contact_name, host_contact_phone, host_contact_role)
  ON public.events FROM anon, authenticated;

GRANT SELECT ON public.events_public TO anon, authenticated;
