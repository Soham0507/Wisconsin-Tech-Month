ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS host_org text,
  ADD COLUMN IF NOT EXISTS host_url text,
  ADD COLUMN IF NOT EXISTS host_org_type text,
  ADD COLUMN IF NOT EXISTS host_email text,
  ADD COLUMN IF NOT EXISTS host_contact_name text,
  ADD COLUMN IF NOT EXISTS host_contact_phone text,
  ADD COLUMN IF NOT EXISTS host_contact_role text;