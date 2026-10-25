-- ============================================================================
-- CLUB BACACHÁ — LOYALTY POINTS LEDGER & REWARDS CATALOG MIGRATION
-- Migration: 20261025000000_loyalty_rewards.sql
-- ============================================================================

-- 1. LOYALTY REWARDS CATALOG
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  points_cost integer NOT NULL CHECK (points_cost > 0),
  category text NOT NULL CHECK (category IN ('MERCHANDISE', 'BOTTLE', 'EXPERIENCE', 'COURTESY')),
  image_url text,
  stock integer DEFAULT 50,
  active boolean NOT NULL DEFAULT true,
  terms text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER update_loyalty_rewards_updated_at
BEFORE UPDATE ON public.loyalty_rewards
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_active ON public.loyalty_rewards(active);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_category ON public.loyalty_rewards(category);

-- 2. LOYALTY TRANSACTIONS (Immutable Points Ledger)
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount integer NOT NULL, -- positive for credits, negative for debits
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  type text NOT NULL CHECK (type IN (
    'WELCOME_BONUS',
    'EVENT_ATTENDANCE',
    'REFERRAL',
    'BENEFIT_REDEEM',
    'MANUAL_ADJUSTMENT',
    'PURCHASE_REWARD'
  )),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_by text DEFAULT 'SYSTEM',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_member ON public.loyalty_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_type ON public.loyalty_transactions(type);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created ON public.loyalty_transactions(created_at DESC);

-- 3. LOYALTY REDEMPTIONS
CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE RESTRICT,
  reward_title text NOT NULL,
  points_spent integer NOT NULL CHECK (points_spent > 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FULFILLED', 'CANCELLED')),
  redemption_code text UNIQUE NOT NULL DEFAULT upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6)),
  notes text,
  fulfilled_at timestamptz,
  fulfilled_by text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TRIGGER update_loyalty_redemptions_updated_at
BEFORE UPDATE ON public.loyalty_redemptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_member ON public.loyalty_redemptions(member_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_code ON public.loyalty_redemptions(redemption_code);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_status ON public.loyalty_redemptions(status);

-- 4. FUNCTION TO GET OR INITIALIZE MEMBER LOYALTY BALANCE
CREATE OR REPLACE FUNCTION public.get_member_points_balance(target_member_id uuid)
RETURNS integer AS $$
DECLARE
  current_bal integer;
BEGIN
  SELECT balance_after INTO current_bal
  FROM public.loyalty_transactions
  WHERE member_id = target_member_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF current_bal IS NULL THEN
    -- Initialize with Welcome Bonus of 50 pts
    INSERT INTO public.loyalty_transactions (
      member_id,
      amount,
      balance_after,
      type,
      description,
      metadata,
      created_by
    ) VALUES (
      target_member_id,
      50,
      50,
      'WELCOME_BONUS',
      'Bono de bienvenida Club Bacachá',
      '{"source": "AUTO_INIT"}'::jsonb,
      'SYSTEM'
    );
    current_bal := 50;
  END IF;

  RETURN current_bal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. SEED INITIAL OFFICIAL REWARDS CATALOG
INSERT INTO public.loyalty_rewards (title, description, points_cost, category, stock, active, terms)
VALUES
  (
    'Playera Oficial Club Bacachá',
    'Edición limitada en algodón peinado negro mate con logotipo Bacachá en serigrafía de alta densidad.',
    150,
    'MERCHANDISE',
    50,
    true,
    'Sujeto a disponibilidad de tallas (S, M, L, XL). Entrega presencial en barra o recepción del Club.'
  ),
  (
    'Gorra Negra Bordada Bacachá',
    'Gorra snapback premium negra con bordado tonal de alta definición de la marca.',
    100,
    'MERCHANDISE',
    40,
    true,
    'Entrega presencial mostrando tu código de canje en puerta o barra.'
  ),
  (
    'Botella Bacachá Tradicional en Mesa',
    'Botella de Bacachá servida en mesa con cortesía de mezcladores para ti y tus acompañantes.',
    300,
    'BOTTLE',
    20,
    true,
    'Válido en noches de apertura con reservación previa o cupo disponible. Servicio de meseros incluido.'
  ),
  (
    'Ronda de Mojitos Bacachá (2 Personas)',
    'Dos mojitos preparados al momento con menta fresca, limón y ron Bacachá.',
    60,
    'COURTESY',
    100,
    true,
    'Válido directamente en barra presentando tu código QR de canje.'
  ),
  (
    'Acceso VIP + Saludo DJ en Cabina',
    'Entrada prioritaria sin fila para 2 personas y acceso temporal a la zona de cabina.',
    200,
    'EXPERIENCE',
    15,
    true,
    'Requiere confirmación previa 24 horas antes del evento.'
  )
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- Public read access for rewards
CREATE POLICY "Allow public read active rewards"
ON public.loyalty_rewards FOR SELECT
USING (active = true);

-- Service role has full access to all loyalty tables
CREATE POLICY "Admin full access rewards"
ON public.loyalty_rewards FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin full access transactions"
ON public.loyalty_transactions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin full access redemptions"
ON public.loyalty_redemptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
