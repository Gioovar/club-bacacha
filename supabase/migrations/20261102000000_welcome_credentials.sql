-- ============================================================================
-- CLUB BACACHÁ — BIENVENIDA Y CREDENCIALES DIGITALES PERSONALIZADAS
-- Migration: 20261102000000_welcome_credentials.sql
-- ============================================================================

-- 1. Asegurar índice único en members.qr_token sin alterar registros existentes
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_qr_token_unique ON public.members(qr_token);

-- 2. Tabla de historial de bienvenidas y credenciales digitales
CREATE TABLE IF NOT EXISTS public.member_welcome_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  admin_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  actor_name text NOT NULL DEFAULT 'Administrador Compartido',
  credential_generated_at timestamptz DEFAULT now() NOT NULL,
  sent_at timestamptz,
  channel text NOT NULL DEFAULT 'WHATSAPP_MANUAL' CHECK (channel IN ('WHATSAPP_MANUAL', 'WHATSAPP_API', 'DOWNLOAD_PNG')),
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'preparado', 'enviado', 'entregado', 'error')),
  last_message text,
  provider_message_id text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER update_member_welcome_logs_updated_at
BEFORE UPDATE ON public.member_welcome_logs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_member_welcome_logs_member ON public.member_welcome_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_member_welcome_logs_status ON public.member_welcome_logs(status);
CREATE INDEX IF NOT EXISTS idx_member_welcome_logs_created ON public.member_welcome_logs(created_at DESC);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.member_welcome_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view and manage welcome logs"
  ON public.member_welcome_logs FOR ALL
  USING (public.is_admin());

CREATE POLICY "Service role full access to welcome logs"
  ON public.member_welcome_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Sembrar plantilla general de bienvenida en admin_config (sin sobrescribir si ya fue personalizada)
INSERT INTO public.admin_config (key, value, description)
VALUES (
  'welcome_message_template',
  jsonb_build_object(
    'text', E'🥃 ¡Bienvenido(a) al Club Bacachá, {nombre}!\n\nTu número de socio es {numero}.\n\nYa formas parte de nuestro club.\n\nTe compartimos tu credencial digital con tu código QR personal. Guárdala y preséntala para identificarte y disfrutar de los beneficios exclusivos para nuestros miembros.\n\n¡Bienvenido al club!',
    'updated_by', 'SYSTEM'
  ),
  'Plantilla general predeterminada para el envío de bienvenida y credencial digital'
)
ON CONFLICT (key) DO NOTHING;

