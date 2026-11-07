export const OFFICIAL_PROMO_VENUE = "Club Bacachá | Cantina Dolores";

export const OFFICIAL_PROMO_BULLETS = [
  "Promociones exclusivas para miembros del Club Bacachá.",
  "Límite de una promoción por miembro.",
  "Válidas hasta las 11:59 pm",
] as const;

export const OFFICIAL_PROMO_CTA_TEXT =
  'Únete al Club Bacachá en "www.bacacha.com" (https://www.bacacha.com).';

export const OFFICIAL_PROMO_CLAUSES_TEXT = `Club Bacachá | Cantina Dolores

• Promociones exclusivas para miembros del Club Bacachá.
• Límite de una promoción por miembro.
• Válidas hasta las 11:59 pm

Únete al Club Bacachá en "www.bacacha.com" (https://www.bacacha.com).`;

/**
 * Garantiza que el texto de términos/condiciones de cualquier promoción del club
 * incluya las cláusulas oficiales de Club Bacachá | Cantina Dolores.
 */
export function ensureOfficialPromoClauses(rawTerms?: string | null): string {
  const trimmed = (rawTerms || "").trim();
  if (!trimmed) {
    return OFFICIAL_PROMO_CLAUSES_TEXT;
  }

  // Si ya contiene las cláusulas oficiales completas, devolver tal cual
  if (
    trimmed.includes("Cantina Dolores") &&
    trimmed.includes("11:59 pm") &&
    trimmed.includes("Límite de una promoción por miembro")
  ) {
    return trimmed;
  }

  // Si tenía el texto genérico por defecto anterior, reemplazarlo limpiamente por las cláusulas oficiales
  if (
    trimmed ===
    "Válido para miembros de Club Bacachá mostrando membresía digital."
  ) {
    return OFFICIAL_PROMO_CLAUSES_TEXT;
  }

  return `${trimmed}\n\n${OFFICIAL_PROMO_CLAUSES_TEXT}`;
}

