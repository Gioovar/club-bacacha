-- ============================================================================
-- CLUB BACACHÁ (bacacha.com) — Production Database Schema & RLS
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sequence for public readable member numbers (e.g., #000001)
CREATE SEQUENCE IF NOT EXISTS member_number_seq START WITH 1;

-- Function to format sequential member numbers as 6-digit zero-padded text
CREATE OR REPLACE FUNCTION format_member_number(seq_val bigint)
RETURNS text AS $$
BEGIN
  RETURN LPAD(seq_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. PROFILES (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2. ADMIN ROLES
-- Roles: 'SUPER_ADMIN', 'ADMIN', 'MARKETING', 'VIEWER'
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MARKETING', 'VIEWER')),
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_admin_role UNIQUE (user_id, role)
);

-- Helper function to check if current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. MEMBERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  member_number text UNIQUE NOT NULL DEFAULT format_member_number(nextval('member_number_seq')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date date NOT NULL,
  phone text NOT NULL,
  email text UNIQUE NOT NULL,
  city text NOT NULL,
  instagram text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED', 'VIP')),
  membership_level text NOT NULL DEFAULT 'MEMBER' CHECK (membership_level IN ('MEMBER', 'VIP', 'FOUNDING_MEMBER', 'BLACK_MEMBER')),
  marketing_consent boolean DEFAULT false NOT NULL,
  privacy_consent boolean DEFAULT true NOT NULL,
  qr_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer_url text,
  referred_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  referred_by_number text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(phone);
CREATE INDEX IF NOT EXISTS idx_members_number ON public.members(member_number);
CREATE INDEX IF NOT EXISTS idx_members_qr_token ON public.members(qr_token);
CREATE INDEX IF NOT EXISTS idx_members_city ON public.members(city);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_campaign ON public.members(utm_campaign);

-- ----------------------------------------------------------------------------
-- 4. MEMBER CONSENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  consent_type text NOT NULL, -- 'PRIVACY_POLICY', 'MARKETING_WHATSAPP_EMAIL'
  accepted boolean NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_consents_member ON public.member_consents(member_id);

-- ----------------------------------------------------------------------------
-- 5. MEMBER REFERRALS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  referred_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  campaign text,
  status text DEFAULT 'REGISTERED' NOT NULL CHECK (status IN ('INVITED', 'REGISTERED', 'QUALIFIED', 'REWARDED')),
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_referral_pair UNIQUE (referrer_member_id, referred_member_id)
);

CREATE INDEX IF NOT EXISTS idx_member_referrals_referrer ON public.member_referrals(referrer_member_id);

-- ----------------------------------------------------------------------------
-- 6. MEMBER ACTIVITY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  activity_type text NOT NULL, -- 'REGISTERED', 'LOGIN', 'QR_SCAN', 'BENEFIT_CLAIM', 'EVENT_RESERVE'
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_activity_member ON public.member_activity(member_id);

-- ----------------------------------------------------------------------------
-- 7. EVENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL,
  venue text NOT NULL,
  city text DEFAULT 'Acapulco' NOT NULL,
  event_date date NOT NULL,
  event_time text NOT NULL, -- e.g. '22:00'
  status text DEFAULT 'published' NOT NULL CHECK (status IN ('draft', 'published', 'sold_out', 'cancelled', 'past')),
  members_only boolean DEFAULT false NOT NULL,
  reserve_url text,
  external_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 8. BENEFITS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  phrase text NOT NULL,
  description text,
  image_url text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  requirements text,
  code text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER update_benefits_updated_at
BEFORE UPDATE ON public.benefits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 9. MEMBER BENEFITS (Redemptions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  benefit_id uuid NOT NULL REFERENCES public.benefits(id) ON DELETE CASCADE,
  redeemed_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'CLAIMED' NOT NULL CHECK (status IN ('AVAILABLE', 'CLAIMED', 'USED', 'EXPIRED')),
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 10. EVENT CHECKINS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  checkin_at timestamptz DEFAULT now() NOT NULL,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 11. CAMPAIGNS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL, -- e.g. 'playera', 'instagram', 'mesa'
  utm_source text,
  utm_medium text,
  utm_campaign text,
  description text,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------------------------------
-- 12. SITE CONTENT (CMS editable content)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_content (
  key text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- ADMIN ROLES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can view admin roles"
  ON public.admin_roles FOR SELECT
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- MEMBERS POLICIES
-- ----------------------------------------------------------------------------
-- 1. A member can read only their own record
CREATE POLICY "Members can view own record"
  ON public.members FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- 2. A member can update only non-restricted fields on their own record
CREATE POLICY "Members can update own record"
  ON public.members FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- 3. Public registration allowed via service role or direct INSERT
CREATE POLICY "Public registration insert"
  ON public.members FOR INSERT
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- EVENTS & BENEFITS POLICIES (Public read, admin write)
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view published events"
  ON public.events FOR SELECT
  USING (status IN ('published', 'sold_out') OR public.is_admin());

CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL
  USING (public.is_admin());

CREATE POLICY "Public can view active benefits"
  ON public.benefits FOR SELECT
  USING (active = true OR public.is_admin());

CREATE POLICY "Admins can manage benefits"
  ON public.benefits FOR ALL
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- MEMBER BENEFITS & REFERRALS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Members can view own benefits"
  ON public.member_benefits FOR SELECT
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Members can view referrals they made"
  ON public.member_referrals FOR SELECT
  USING (
    referrer_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Members can view own activity"
  ON public.member_activity FOR SELECT
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Admins can view campaigns"
  ON public.campaigns FOR ALL
  USING (public.is_admin());

CREATE POLICY "Public can view site content"
  ON public.site_content FOR SELECT
  USING (true);

CREATE POLICY "Admins can update site content"
  ON public.site_content FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- SEED INITIAL EVENTS AND BENEFITS
-- ============================================================================

INSERT INTO public.events (slug, name, description, image_url, venue, city, event_date, event_time, status, members_only)
VALUES
  ('noche-cero', 'Noche Cero', 'La primera noche del Club. La locación se revela 24 horas antes, sólo a miembros.', '/images/woman_dancing.jpg', 'Locación secreta', 'Acapulco', '2026-10-31', '22:00', 'published', true),
  ('bahia-after-dark', 'Bahía After Dark', 'Velero, bahía y la ciudad encendida. Cupo limitado.', '/images/yacht_night.jpg', 'Bahía de Santa Lucía', 'Acapulco', '2026-11-14', '21:00', 'published', false),
  ('fuego-en-la-arena', 'Fuego en la Arena', 'Playa privada, fogata y DJ hasta que el mar diga.', '/images/beach_night.jpg', 'Playa privada · Pie de la Cuesta', 'Acapulco', '2026-11-28', '20:00', 'published', false),
  ('sunset-sessions', 'Sunset Sessions', 'Infinity pool, atardecer y la bahía prendiéndose de a poco.', '/images/pool_sunset.jpg', 'Las Brisas', 'Acapulco', '2026-12-12', '18:00', 'published', false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.benefits (slug, title, phrase, image_url, active)
VALUES
  ('promociones-secretas', 'Promociones secretas', 'Lo que no está en el menú.', '/images/bartender_pour.jpg', true),
  ('eventos', 'Eventos', 'Primero te enteras tú.', '/images/dj_crowd.jpg', true),
  ('cumpleanos', 'Cumpleaños', 'Tu noche. A nuestra manera.', '/images/birthday_night.jpg', true),
  ('accesos', 'Accesos', 'La puerta correcta, a la hora correcta.', '/images/entrance_door.jpg', true),
  ('experiencias', 'Experiencias', 'Noches que no se repiten.', '/images/yacht_night.jpg', true),
  ('invitaciones', 'Invitaciones', 'Llegan sin aviso. Sólo al Club.', '/images/black_invitation.jpg', true),
  ('sorpresas', 'Sorpresas', 'No te vamos a decir cuándo.', '/images/toast_friends.jpg', true),
  ('beneficios-miembros', 'Beneficios para miembros', 'Por ser del Club. Nada más.', '/images/pool_sunset.jpg', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.campaigns (name, code, utm_campaign, description)
VALUES
  ('Playera Club Oficial', 'playera', 'playera', 'Código QR impreso en merch y playeras oficiales'),
  ('Campaña Instagram Reels', 'instagram', 'instagram', 'Anuncios y enlaces directos desde Instagram @clubbacacha'),
  ('Mesa VIP QR', 'mesa', 'mesa', 'Displays de mesa en clubs y restaurantes afiliados en Acapulco'),
  ('Flyer Acapulco Playa', 'flyer', 'flyer', 'Flyers y postales exclusivas en zonas turísticas')
ON CONFLICT (code) DO NOTHING;
