-- ============================================================================
-- CLUB BACACHÁ — CRM & FIDELIZACIÓN DATABASE MIGRATION
-- Migration: 20261018000000_crm_system.sql
-- ============================================================================

-- 1. ADMIN USERS
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL DEFAULT 'Administrador Compartido',
  role text NOT NULL DEFAULT 'SUPER_ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MARKETING', 'OPERATOR')),
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. ADMIN SESSIONS
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  ip_address text,
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON public.admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON public.admin_sessions(admin_user_id);

-- 3. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  actor_name text NOT NULL DEFAULT 'administrador compartido',
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);

-- 4. ADMIN CONFIG & FIDELIZACIÓN RULES
CREATE TABLE IF NOT EXISTS public.admin_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 5. MEMBER ENGAGEMENT SCORES
CREATE TABLE IF NOT EXISTS public.member_engagement_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid UNIQUE NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  total_score integer NOT NULL DEFAULT 5,
  score_30d integer NOT NULL DEFAULT 5,
  score_60d integer NOT NULL DEFAULT 5,
  score_90d integer NOT NULL DEFAULT 5,
  category text NOT NULL DEFAULT 'NUEVO_MIEMBRO',
  events_reserved_count integer NOT NULL DEFAULT 0,
  events_attended_count integer NOT NULL DEFAULT 0,
  benefits_claimed_count integer NOT NULL DEFAULT 0,
  benefits_used_count integer NOT NULL DEFAULT 0,
  referrals_invited_count integer NOT NULL DEFAULT 0,
  referrals_confirmed_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_engagement_score ON public.member_engagement_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_member_engagement_category ON public.member_engagement_scores(category);
CREATE INDEX IF NOT EXISTS idx_member_engagement_last_act ON public.member_engagement_scores(last_activity_at DESC);

-- 6. MEMBER TAGS
CREATE TABLE IF NOT EXISTS public.member_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_member_tag UNIQUE (member_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_member_tags_member ON public.member_tags(member_id);
CREATE INDEX IF NOT EXISTS idx_member_tags_tag ON public.member_tags(tag);

-- 7. MEMBER NOTES
CREATE TABLE IF NOT EXISTS public.member_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  admin_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Administrador Compartido',
  note text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_notes_member ON public.member_notes(member_id);

-- 8. ADMIN TASKS & FOLLOW-UPS
CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  assigned_to text DEFAULT 'Administrador Compartido',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON public.admin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_member ON public.admin_tasks(member_id);

-- 9. COMMUNICATION LOGS
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('WHATSAPP_CLICK', 'EMAIL_SENT', 'MANUAL_CALL', 'NOTE')),
  template_slug text,
  message_preview text,
  phone text,
  actor_name text NOT NULL DEFAULT 'Administrador Compartido',
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_member ON public.communication_logs(member_id);

-- 10. SAVED SEGMENTS
CREATE TABLE IF NOT EXISTS public.saved_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL,
  created_by text DEFAULT 'Administrador Compartido',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 11. ENHANCE EVENT CHECKINS CONSTRAINTS & COLUMNS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_event_member_checkin'
  ) THEN
    ALTER TABLE public.event_checkins ADD CONSTRAINT unique_event_member_checkin UNIQUE (event_id, member_id);
  END IF;
END $$;

ALTER TABLE public.event_checkins ADD COLUMN IF NOT EXISTS verified_by_name text DEFAULT 'Operador';

-- 12. ENHANCE MEMBER BENEFITS
ALTER TABLE public.member_benefits ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.member_benefits ADD COLUMN IF NOT EXISTS used_at timestamptz;

-- 13. ENABLE RLS ON NEW TABLES
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_engagement_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_segments ENABLE ROW LEVEL SECURITY;

-- 14. SEED DEFAULT CONFIG
INSERT INTO public.admin_config (key, value, description)
VALUES
(
  'scoring_rules',
  jsonb_build_object(
    'affiliation', 5,
    'event_attendance', 20,
    'benefit_redeemed', 15,
    'referral_registered', 10,
    'dynamic_verified', 10
  ),
  'Puntuaciones base para Bacachá Engagement Score'
),
(
  'loyalty_thresholds',
  jsonb_build_object(
    'participativo_min', 20,
    'destacado_min', 50,
    'embajador_referrals_min', 2,
    'reciente_dias', 30,
    'reactivar_dias', 60
  ),
  'Umbrales automáticos de categorización de miembros'
),
(
  'whatsapp_templates',
  jsonb_build_array(
    jsonb_build_object(
      'slug', 'bienvenida',
      'name', 'Bienvenida al Club',
      'category', 'onboarding',
      'text', '¡Hola {{nombre}}! Bienvenido oficialmente a Club Bacachá. Tu membresía es la #{{member_id}}. Prepárate para beneficios y experiencias exclusivas.'
    ),
    jsonb_build_object(
      'slug', 'cumpleanos',
      'name', 'Felicitación de Cumpleaños',
      'category', 'celebration',
      'text', '¡Feliz cumpleaños {{nombre}} de parte de todo el equipo de Club Bacachá! 🍾 Queremos celebrarte en grande con una cortesía especial en tu próxima visita.'
    ),
    jsonb_build_object(
      'slug', 'invitacion_evento',
      'name', 'Invitación a Evento Exclusivo',
      'category', 'events',
      'text', 'Hola {{nombre}}, tenemos una fecha privada para miembros del Club: {{evento}} este {{fecha}}. Tu acceso de socio #{{member_id}} tiene lugar reservado. ¿Nos vemos ahí?'
    ),
    jsonb_build_object(
      'slug', 'beneficio',
      'name', 'Recordatorio de Beneficio',
      'category', 'benefits',
      'text', 'Hola {{nombre}}, tienes disponible el beneficio: {{beneficio}} exclusivo con tu membresía #{{member_id}}. Muestra tu QR de socio en tu próxima visita para hacerlo válido.'
    ),
    jsonb_build_object(
      'slug', 'reactivacion',
      'name', 'Campaña de Reactivación',
      'category', 'loyalty',
      'text', '¡{{nombre}}, hace rato que no te vemos en el Club! Tenemos nuevas fechas y experiencias que te van a encantar. ¿Te reservamos una mesa para este fin de semana?'
    ),
    jsonb_build_object(
      'slug', 'agradecimiento_referido',
      'name', 'Agradecimiento por Recomendación',
      'category', 'referrals',
      'text', '¡Muchas gracias {{nombre}} por invitar amigos al Club Bacachá! Tus recomendados ya son parte del Club y tu puntuación de embajador ha subido.'
    ),
    jsonb_build_object(
      'slug', 'personalizado',
      'name', 'Mensaje Libre Personalizado',
      'category', 'custom',
      'text', 'Hola {{nombre}}, te escribimos de parte de la administración de Club Bacachá sobre tu membresía #{{member_id}}.'
    )
  ),
  'Plantillas oficiales preconfiguradas para contacto por WhatsApp'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- 15. BACKFILL ENGAGEMENT SCORES FOR ALL EXISTING MEMBERS
INSERT INTO public.member_engagement_scores (member_id, total_score, score_30d, score_60d, score_90d, category, last_activity_at)
SELECT
  m.id,
  5,
  5,
  5,
  5,
  'NUEVO_MIEMBRO',
  m.created_at
FROM public.members m
ON CONFLICT (member_id) DO NOTHING;
