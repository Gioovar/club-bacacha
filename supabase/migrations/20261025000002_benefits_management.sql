-- ============================================================================
-- CLUB BACACHÁ — ADVANCED BENEFITS & REDEMPTIONS MANAGEMENT
-- Migration: 20261025000002_benefits_management.sql
-- ============================================================================

-- 1. ADD EXTENSION COLUMNS TO public.benefits
ALTER TABLE public.benefits
  ADD COLUMN IF NOT EXISTS benefit_type text NOT NULL DEFAULT 'MEMBER_PROMO'
    CHECK (benefit_type IN ('MEMBER_PROMO', 'EVENT_PROMO', 'POINTS_REWARD', 'BIRTHDAY_BENEFIT')),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS points_cost integer DEFAULT 0 CHECK (points_cost >= 0),
  ADD COLUMN IF NOT EXISTS points_award integer DEFAULT 0 CHECK (points_award >= 0),
  ADD COLUMN IF NOT EXISTS venue text DEFAULT 'Costera Miguel Alemán · Acapulco',
  ADD COLUMN IF NOT EXISTS terms text,
  ADD COLUMN IF NOT EXISTS max_redemptions_total integer,
  ADD COLUMN IF NOT EXISTS max_redemptions_per_member integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stock integer,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. ADD EXTENSION COLUMNS TO public.member_benefits
ALTER TABLE public.member_benefits
  ADD COLUMN IF NOT EXISTS benefit_type text,
  ADD COLUMN IF NOT EXISTS points_spent integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_awarded integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_by_name text,
  ADD COLUMN IF NOT EXISTS redemption_code text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS used_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 3. INDEXES FOR HIGH-THROUGHPUT SEARCH & PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_benefits_status ON public.benefits(status);
CREATE INDEX IF NOT EXISTS idx_benefits_type ON public.benefits(benefit_type);
CREATE INDEX IF NOT EXISTS idx_benefits_event ON public.benefits(event_id);
CREATE INDEX IF NOT EXISTS idx_benefits_active ON public.benefits(active);
CREATE INDEX IF NOT EXISTS idx_member_benefits_member ON public.member_benefits(member_id);
CREATE INDEX IF NOT EXISTS idx_member_benefits_benefit ON public.member_benefits(benefit_id);
CREATE INDEX IF NOT EXISTS idx_member_benefits_code ON public.member_benefits(redemption_code);

-- 4. STORAGE POLICIES FOR benefit-flyers BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'benefit-flyers',
  'benefit-flyers',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Allow public read of benefit flyers
CREATE POLICY "Public Read Benefit Flyers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'benefit-flyers');

-- Allow authenticated and service role to upload benefit flyers
CREATE POLICY "Admin Upload Benefit Flyers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'benefit-flyers');

CREATE POLICY "Admin Update Benefit Flyers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'benefit-flyers');

CREATE POLICY "Admin Delete Benefit Flyers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'benefit-flyers');
