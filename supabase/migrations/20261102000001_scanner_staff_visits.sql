-- ============================================================================
-- CLUB BACACHÁ — SISTEMA DE SCANNER, EMPLEADOS Y CONTROL DE VISITAS
-- Migration: 20261102000001_scanner_staff_visits.sql
-- ============================================================================

-- 1. EMPLEADOS DEL CLUB (Staff para /scanner)
CREATE TABLE IF NOT EXISTS public.staff_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  username text UNIQUE,
  role text NOT NULL CHECK (role IN ('MESERO', 'HOSTESS', 'SUPERVISOR', 'GERENTE')),
  status text NOT NULL DEFAULT 'PENDIENTE_ACTIVACION' CHECK (status IN ('PENDIENTE_ACTIVACION', 'ACTIVO', 'INACTIVO')),
  password_hash text,
  must_change_password boolean NOT NULL DEFAULT false,
  temp_password_expires_at timestamptz,
  visits_registered_count integer NOT NULL DEFAULT 0,
  last_login_at timestamptz,
  last_active_at timestamptz,
  created_by text DEFAULT 'Administrador Compartido',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER update_staff_employees_updated_at
BEFORE UPDATE ON public.staff_employees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_staff_employees_phone ON public.staff_employees(phone);
CREATE INDEX IF NOT EXISTS idx_staff_employees_status ON public.staff_employees(status);
CREATE INDEX IF NOT EXISTS idx_staff_employees_role ON public.staff_employees(role);

-- 2. INVITACIONES DE ACCESO PARA EMPLEADOS (Firmadas, de un solo uso y con vencimiento)
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.staff_employees(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_by text DEFAULT 'Administrador Compartido',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_employee ON public.staff_invitations(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON public.staff_invitations(token_hash);

-- 3. SESIONES INDEPENDIENTES DE SCANNER (/scanner)
CREATE TABLE IF NOT EXISTS public.staff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.staff_employees(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  ip_address text,
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_token ON public.staff_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_employee ON public.staff_sessions(employee_id);

-- 4. REGISTRO DE VISITAS POR JORNADA OPERATIVA (Prevención de duplicados en BD)
CREATE TABLE IF NOT EXISTS public.member_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.staff_employees(id) ON DELETE SET NULL,
  employee_name text NOT NULL,
  employee_role text NOT NULL DEFAULT 'HOSTESS',
  shift_date text NOT NULL, -- Ej: '2026-11-02' según la jornada operativa configurada
  visit_number integer NOT NULL DEFAULT 1,
  points_awarded integer NOT NULL DEFAULT 0,
  qr_token_used text,
  notes text,
  visited_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_member_shift_visit UNIQUE (member_id, shift_date)
);

CREATE INDEX IF NOT EXISTS idx_member_visits_member ON public.member_visits(member_id);
CREATE INDEX IF NOT EXISTS idx_member_visits_employee ON public.member_visits(employee_id);
CREATE INDEX IF NOT EXISTS idx_member_visits_shift ON public.member_visits(shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_member_visits_visited_at ON public.member_visits(visited_at DESC);

-- 5. HABILITAR RLS EN TODAS LAS TABLAS NUEVAS
ALTER TABLE public.staff_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage staff_employees"
  ON public.staff_employees FOR ALL
  USING (public.is_admin());

CREATE POLICY "Service role full access staff_employees"
  ON public.staff_employees FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins manage staff_invitations"
  ON public.staff_invitations FOR ALL
  USING (public.is_admin());

CREATE POLICY "Service role full access staff_invitations"
  ON public.staff_invitations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins manage staff_sessions"
  ON public.staff_sessions FOR ALL
  USING (public.is_admin());

CREATE POLICY "Service role full access staff_sessions"
  ON public.staff_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins view and manage member_visits"
  ON public.member_visits FOR ALL
  USING (public.is_admin());

CREATE POLICY "Service role full access member_visits"
  ON public.member_visits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. CONFIGURACIÓN PREDETERMINADA DE JORNADA Y REGLAS DE VISITAS
INSERT INTO public.admin_config (key, value, description)
VALUES (
  'visit_loyalty_rules',
  jsonb_build_object(
    'shift_cutoff_hour', 6,
    'timezone', 'America/Mexico_City',
    'points_per_visit_enabled', false,
    'points_per_visit', 20,
    'milestone_visits_threshold', 5
  ),
  'Configuración de jornada operativa nocturna y reglas de puntos por visita en el scanner'
)
ON CONFLICT (key) DO NOTHING;
