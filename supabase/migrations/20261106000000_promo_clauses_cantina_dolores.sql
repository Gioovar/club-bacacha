-- ============================================================================
-- CLÁUSULAS OFICIALES DE PROMOCIONES: CLUB BACACHÁ | CANTINA DOLORES
-- ============================================================================
-- • Promociones exclusivas para miembros del Club Bacachá.
-- • Límite de una promoción por miembro.
-- • Válidas hasta las 11:59 pm
-- Únete al Club Bacachá en "www.bacacha.com" (https://www.bacacha.com).
-- ============================================================================

DO $$
DECLARE
  official_clauses TEXT := E'Club Bacachá | Cantina Dolores\n\n• Promociones exclusivas para miembros del Club Bacachá.\n• Límite de una promoción por miembro.\n• Válidas hasta las 11:59 pm\n\nÚnete al Club Bacachá en "www.bacacha.com" (https://www.bacacha.com).';
BEGIN
  -- Actualizar promociones en public.benefits si existen las columnas extendidas
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'benefits' AND column_name = 'terms'
  ) THEN
    UPDATE public.benefits
    SET
      venue = COALESCE(NULLIF(venue, ''), 'Club Bacachá | Cantina Dolores'),
      max_redemptions_per_member = 1,
      terms = CASE
        WHEN terms IS NULL OR BTRIM(terms) = '' OR BTRIM(terms) = 'Válido para miembros de Club Bacachá mostrando membresía digital.'
          THEN official_clauses
        WHEN terms LIKE '%Cantina Dolores%' AND terms LIKE '%11:59 pm%'
          THEN terms
        ELSE terms || E'\n\n' || official_clauses
      END;
  END IF;

  -- Actualizar recompensas en public.loyalty_rewards si la tabla existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'loyalty_rewards'
  ) THEN
    UPDATE public.loyalty_rewards
    SET
      terms = CASE
        WHEN terms IS NULL OR BTRIM(terms) = ''
          THEN official_clauses
        WHEN terms LIKE '%Cantina Dolores%' AND terms LIKE '%11:59 pm%'
          THEN terms
        ELSE terms || E'\n\n' || official_clauses
      END;
  END IF;
END $$;
