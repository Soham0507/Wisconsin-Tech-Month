
-- Enum for event submission status
CREATE TYPE public.event_status AS ENUM ('draft', 'pending', 'approved', 'denied');
CREATE TYPE public.event_path AS ENUM ('external', 'internal');
CREATE TYPE public.event_format AS ENUM ('in-person', 'virtual', 'hybrid');

-- Reusable updated_at trigger fn
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ events ============
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.event_status NOT NULL DEFAULT 'pending',
  path public.event_path NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  host_org text NOT NULL,
  image_url text,
  week text NOT NULL,
  track text,
  format public.event_format NOT NULL,
  region text NOT NULL,
  city text NOT NULL,
  venue text,
  address text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity int,
  cost_cents int NOT NULL DEFAULT 0,
  external_url text,
  topics text[] NOT NULL DEFAULT '{}',
  audience text[] NOT NULL DEFAULT '{}',
  denial_reason text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can read approved events
CREATE POLICY "Public read approved events"
  ON public.events FOR SELECT
  USING (status = 'approved');

-- Organizers can read their own events (any status)
CREATE POLICY "Organizers read own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (organizer_id = auth.uid());

-- Admins can read all events
CREATE POLICY "Admins read all events"
  ON public.events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Organizers can insert their own events
CREATE POLICY "Organizers insert own events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id = auth.uid());

-- Organizers can update their own events
CREATE POLICY "Organizers update own events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

-- Admins can update any event (for approval / denial)
CREATE POLICY "Admins update all events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Organizers can delete their own drafts
CREATE POLICY "Organizers delete own events"
  ON public.events FOR DELETE
  TO authenticated
  USING (organizer_id = auth.uid());

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX events_status_idx ON public.events(status);
CREATE INDEX events_organizer_idx ON public.events(organizer_id);
CREATE INDEX events_starts_at_idx ON public.events(starts_at);

-- ============ event_registrations ============
CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

GRANT INSERT ON public.event_registrations TO anon;
GRANT SELECT, INSERT ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can register for an approved event
CREATE POLICY "Anyone can register for approved events"
  ON public.event_registrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND e.status = 'approved'
        AND e.path = 'internal'
    )
    AND length(name) BETWEEN 1 AND 120
    AND length(email) BETWEEN 3 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- Organizer of the event can read its registrations
CREATE POLICY "Organizer reads own event registrations"
  ON public.event_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid())
  );

-- Admins read all registrations
CREATE POLICY "Admins read all registrations"
  ON public.event_registrations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX event_registrations_event_idx ON public.event_registrations(event_id);

-- ============ event_clicks ============
CREATE TABLE public.event_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.event_clicks TO anon;
GRANT SELECT, INSERT ON public.event_clicks TO authenticated;
GRANT ALL ON public.event_clicks TO service_role;

ALTER TABLE public.event_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a click for approved external events"
  ON public.event_clicks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'approved' AND e.path = 'external'
    )
  );

CREATE POLICY "Organizer reads own event clicks"
  ON public.event_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid())
  );

CREATE POLICY "Admins read all clicks"
  ON public.event_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX event_clicks_event_idx ON public.event_clicks(event_id);

-- ============ profiles (light) ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
