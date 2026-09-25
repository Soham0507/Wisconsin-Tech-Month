
-- Tighten storage.objects SELECT policy for event-images bucket
DROP POLICY IF EXISTS "Event images are readable by anyone" ON storage.objects;

-- Public can only read images that belong to an approved event
CREATE POLICY "Approved event images are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.status = 'approved'
      AND e.image_url IS NOT NULL
      AND e.image_url LIKE '%' || storage.objects.name
  )
);

-- Owners can always read their own uploads (pending review, unpublished, etc.)
CREATE POLICY "Users can read own event images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'event-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Admins can read all event images
CREATE POLICY "Admins can read all event images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'event-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
