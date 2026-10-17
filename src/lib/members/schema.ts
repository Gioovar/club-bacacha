import { z } from "zod";
import { SITE } from "@/lib/site";

/** Age in full years at `now` for an ISO date (YYYY-MM-DD). */
export function ageFrom(isoDate: string, now: Date = new Date()): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return NaN;
  let age = now.getFullYear() - y;
  const beforeBirthday =
    now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

export const DEVICE_TYPES = ["mobile", "tablet", "desktop"] as const;

/** Captured client-side from the landing URL (first/last non-direct touch). */
export const attributionSchema = z
  .object({
    utm_source: z.string().max(120),
    utm_medium: z.string().max(120),
    utm_campaign: z.string().max(120),
    utm_content: z.string().max(120),
    utm_term: z.string().max(120),
    /** Offline QR / campaign code, e.g. ?qr=playera */
    qr_code: z.string().max(120),
    /** Referrer member number, e.g. ?ref=001284 */
    ref: z.string().regex(/^\d{1,9}$/),
    landing_url: z.string().max(2048),
    referrer: z.string().max(2048),
    device_type: z.enum(DEVICE_TYPES),
    first_seen_at: z.string().max(40),
  })
  .partial();

export type Attribution = z.infer<typeof attributionSchema>;

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export const registrationSchema = z.object({
  firstName: z.string().trim().min(2, "Escribe tu nombre").max(60, "Nombre demasiado largo"),
  lastName: z.string().trim().min(2, "Escribe tu apellido").max(80, "Apellido demasiado largo"),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Indica tu fecha de nacimiento")
    .refine((v) => {
      const age = ageFrom(v);
      return Number.isFinite(age) && age < 110;
    }, "Fecha no válida")
    .refine((v) => ageFrom(v) >= SITE.minAge, `Debes ser mayor de ${SITE.minAge} años para entrar al Club`),
  phone: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length >= 10 && v.length <= 13, "Escribe un WhatsApp válido (10 dígitos)"),
  email: z.string().trim().toLowerCase().pipe(z.email("Escribe un correo válido")),
  city: z.string().trim().min(2, "¿Desde qué ciudad nos visitas?").max(80),
  instagram: z
    .string()
    .trim()
    .max(31)
    .transform((v) => v.replace(/^@+/, ""))
    .refine((v) => v === "" || /^[a-zA-Z0-9._]{1,30}$/.test(v), "Usuario de Instagram no válido")
    .optional(),
  acceptPrivacy: z.literal(true, "Necesitamos que aceptes el Aviso de Privacidad"),
  acceptMarketing: z.boolean(),
  attribution: attributionSchema.optional(),
});

export type RegistrationInput = z.input<typeof registrationSchema>;
export type RegistrationData = z.output<typeof registrationSchema>;
