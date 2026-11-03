export type WelcomeStatus =
  | "pendiente"
  | "preparado"
  | "enviado"
  | "entregado"
  | "error";

export type WelcomeChannel =
  | "WHATSAPP_MANUAL"
  | "WHATSAPP_API"
  | "DOWNLOAD_PNG";

export interface WelcomeHistoryRecord {
  id: string;
  member_id: string;
  admin_user_id: string | null;
  actor_name: string;
  credential_generated_at: string;
  sent_at: string | null;
  channel: WelcomeChannel;
  status: WelcomeStatus;
  last_message: string;
  provider_message_id?: string | null;
  created_at: string;
}

export const DEFAULT_WELCOME_TEMPLATE = `🥃 ¡Bienvenido(a) al Club Bacachá, {nombre}!

Tu número de socio es {numero}.

Ya formas parte de nuestro club.

Te compartimos tu credencial digital con tu código QR personal. Guárdala y preséntala para identificarte y disfrutar de los beneficios exclusivos para nuestros miembros.

¡Bienvenido al club!`;

/**
 * Formatea el número de miembro siempre como #000049
 */
export function formatMemberBadge(memberNumber: string | number): string {
  const clean = String(memberNumber ?? "")
    .trim()
    .replace(/^#+/, "");
  return `#${clean.padStart(6, "0")}`;
}

/**
 * Nombre completo limpio del miembro real
 */
export function formatMemberFullName(member: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const first = (member.first_name || "").trim();
  const last = (member.last_name || "").trim();
  return [first, last].filter(Boolean).join(" ").trim();
}

/**
 * Sustituye las variables {nombre} y {numero} con los datos reales del miembro.
 */
export function renderWelcomeMessage(
  template: string,
  member: {
    first_name?: string | null;
    last_name?: string | null;
    member_number: string | number;
  }
): string {
  const fullName = formatMemberFullName(member) || (member.first_name || "").trim();
  const formattedNumber = formatMemberBadge(member.member_number);
  const rawDigits = formattedNumber.replace(/^#/, "");

  const base = template && template.trim().length > 0 ? template : DEFAULT_WELCOME_TEMPLATE;

  return base
    .replace(/\{\{\s*nombre\s*\}\}/gi, fullName)
    .replace(/\{\s*nombre\s*\}/gi, fullName)
    .replace(/#\{\{\s*numero\s*\}\}/gi, formattedNumber)
    .replace(/#\{\s*numero\s*\}/gi, formattedNumber)
    .replace(/\{\{\s*numero\s*\}\}/gi, formattedNumber)
    .replace(/\{\s*numero\s*\}/gi, formattedNumber)
    .replace(/#\{\{\s*member_id\s*\}\}/gi, formattedNumber)
    .replace(/\{\{\s*member_id\s*\}\}/gi, rawDigits)
    .replace(/\{\s*member_id\s*\}/gi, formattedNumber);
}

/**
 * Valida y normaliza un teléfono al formato internacional E.164 (sin '+') para WhatsApp.
 * En México: 10 dígitos -> 52 + 10 dígitos.
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined): {
  valid: boolean;
  normalized: string;
  display: string;
  error?: string;
} {
  if (!phone || !phone.trim()) {
    return {
      valid: false,
      normalized: "",
      display: "Sin teléfono",
      error: "El miembro no tiene un número de teléfono registrado.",
    };
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length < 10) {
    return {
      valid: false,
      normalized: digits,
      display: phone,
      error: `El teléfono registrado (${phone}) tiene menos de 10 dígitos válidos.`,
    };
  }

  if (digits.length > 15) {
    return {
      valid: false,
      normalized: digits,
      display: phone,
      error: `El teléfono registrado (${phone}) excede la longitud internacional permitida.`,
    };
  }

  // Número nacional mexicano de 10 dígitos -> agregar código de país 52
  if (digits.length === 10) {
    const normalized = `52${digits}`;
    return {
      valid: true,
      normalized,
      display: `+52 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`,
    };
  }

  // Número con prefijo 521 + 10 dígitos (13 dígitos) o 52 + 10 dígitos (12 dígitos)
  if (digits.length === 12 && digits.startsWith("52")) {
    const local = digits.slice(2);
    return {
      valid: true,
      normalized: digits,
      display: `+52 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`,
    };
  }

  if (digits.length === 13 && digits.startsWith("521")) {
    const local = digits.slice(3);
    return {
      valid: true,
      normalized: `52${local}`,
      display: `+52 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`,
    };
  }

  // Otro número internacional válido (11 a 15 dígitos)
  return {
    valid: true,
    normalized: digits,
    display: `+${digits}`,
  };
}

/**
 * Construye la URL oficial controlada por el sistema para el QR del miembro.
 * Nunca incluye nombre, teléfono, correo ni datos sensibles.
 */
export function buildMemberVerificationUrl(qrToken: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bacacha.com")
    .replace(/\/+$/, "")
    .replace(/^https:\/\/www\.bacacha\.com$/i, "https://bacacha.com");
  return `${baseUrl}/m/${encodeURIComponent(qrToken.trim())}`;
}

