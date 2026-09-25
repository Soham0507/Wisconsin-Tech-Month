ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS host_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS host_contact_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS host_contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS host_contact_role text NOT NULL DEFAULT '';