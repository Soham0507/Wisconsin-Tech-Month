ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS host_logo_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS host_logo_url text;