-- ============================================================================
-- MIGRATION: 20261025000001_events_management.sql
-- Extensiones para la gestión completa y real de eventos de Club Bacachá
-- ============================================================================

-- 1. Agregar columnas aditivas a la tabla events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'PARTY',
  ADD COLUMN IF NOT EXISTS end_time text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS directions text,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ticket_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_rsvp boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS rsvp_status text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS rsvp_start_date date,
  ADD COLUMN IF NOT EXISTS rsvp_end_date date,
  ADD COLUMN IF NOT EXISTS social_dynamic text DEFAULT 'SEMAFORO',
  ADD COLUMN IF NOT EXISTS requires_checkin boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS points_award integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. Actualizar el constraint de status para permitir borradores, programados y archivados
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_status_check'
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT events_status_check;
  END IF;
END $$;

ALTER TABLE public.events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('draft', 'scheduled', 'published', 'sold_out', 'cancelled', 'past', 'archived'));

-- 3. Crear índices para optimizar consultas de la landing y administración
CREATE INDEX IF NOT EXISTS idx_events_status_date ON public.events (status, event_date ASC);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events (slug);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_member ON public.event_registrations (event_id, member_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_event_member ON public.event_checkins (event_id, member_id);

-- 4. Crear bucket público para almacenamiento de flyers si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-flyers',
  'event-flyers',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 5. Políticas de almacenamiento de flyers
CREATE POLICY "Public read event-flyers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-flyers');

CREATE POLICY "Admin upload event-flyers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-flyers');

CREATE POLICY "Admin update event-flyers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'event-flyers');

CREATE POLICY "Admin delete event-flyers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-flyers');
