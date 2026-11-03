import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "@/lib/admin/crypto";
import { logAdminAudit } from "@/lib/admin/session";
import { normalizeWhatsAppPhone } from "@/lib/members/welcome";
import {
  getMemberQrFichaByToken,
  type MemberQrFicha,
} from "@/lib/members/qr-ficha-server";

export const SCANNER_COOKIE_NAME = "bacacha_scanner_token";
const SCANNER_SESSION_HOURS = 16; // Cubre turnos operativos completos
const INVITATION_EXPIRY_HOURS = 48;

export type StaffRole = "MESERO" | "HOSTESS" | "SUPERVISOR" | "GERENTE";
export type StaffStatus = "PENDIENTE_ACTIVACION" | "ACTIVO" | "INACTIVO";

export interface StaffEmployee {
  id: string;
  name: string;
  phone: string;
  username: string;
  role: StaffRole;
  status: StaffStatus;
  password_hash?: string | null;
  must_change_password: boolean;
  temp_password_expires_at?: string | null;
  visits_registered_count: number;
  last_login_at: string | null;
  last_active_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StaffInvitationRecord {
  id: string;
  employee_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  revoked: boolean;
  created_by: string;
  created_at: string;
}

export interface StaffSessionRecord {
  id: string;
  employee_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

export interface VisitLoyaltyRules {
  shift_cutoff_hour: number; // Hora de corte de jornada (ej. 6 = 06:00 AM)
  timezone: string; // 'America/Mexico_City'
  points_per_visit_enabled: boolean; // false por defecto hasta que el dueño lo active
  points_per_visit: number; // ej. 20
  milestone_visits_threshold: number; // ej. 5
}

export const DEFAULT_VISIT_LOYALTY_RULES: VisitLoyaltyRules = {
  shift_cutoff_hour: 6,
  timezone: "America/Mexico_City",
  points_per_visit_enabled: false,
  points_per_visit: 20,
  milestone_visits_threshold: 5,
};

// Control de intentos fallidos en memoria respaldado por admin_audit_logs
const SCANNER_FAILED_ATTEMPTS: Record<
  string,
  { count: number; lockedUntil: number }
> = {};
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCKOUT_MS = 5 * 60 * 1000;

// Candado en memoria por (member_id + shift_date) para serializar peticiones simultáneas en el mismo proceso
const IN_FLIGHT_VISIT_LOCKS = new Map<string, Promise<unknown>>();

type SupabaseAdmin = NonNullable<ReturnType<typeof createAdminClient>>;

function getSigningSecret(): string {
  return (
    process.env.ADMIN_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "bacacha-scanner-secret-key"
  );
}

/**
 * Firma y verifica tokens de invitación para garantizar autenticidad criptográfica.
 */
export function createSignedInviteToken(employeeId: string): {
  rawToken: string;
  tokenHash: string;
} {
  const nonce = generateSessionToken();
  const payload = `${employeeId}.${nonce}`;
  const sig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 24);
  const rawToken = `${nonce}${sig}`;
  const tokenHash = hashSessionToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Construye el mensaje oficial de invitación por WhatsApp para el empleado.
 */
export function buildStaffInvitationWhatsAppMessage(params: {
  name: string;
  role: StaffRole;
  activationUrl: string;
}): string {
  return `🥃 ¡Hola, ${params.name}!

Te damos la bienvenida al equipo de Club Bacachá.

Ya tienes acceso a nuestro sistema digital para registrar las visitas de nuestros socios.

Tu puesto: ${params.role}

Activa tu acceso aquí:

${params.activationUrl}

Una vez activada tu cuenta, podrás ingresar en:

https://bacacha.com/scanner`;
}

/**
 * Obtiene las reglas de jornada operativa y puntos por visita desde admin_config.
 */
export async function getVisitLoyaltyRules(
  supabase: SupabaseAdmin
): Promise<VisitLoyaltyRules> {
  try {
    const { data } = await supabase
      .from("admin_config")
      .select("value")
      .eq("key", "visit_loyalty_rules")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      const v = data.value as Record<string, any>;
      return {
        shift_cutoff_hour:
          typeof v.shift_cutoff_hour === "number"
            ? Math.max(0, Math.min(12, v.shift_cutoff_hour))
            : DEFAULT_VISIT_LOYALTY_RULES.shift_cutoff_hour,
        timezone:
          typeof v.timezone === "string"
            ? v.timezone
            : DEFAULT_VISIT_LOYALTY_RULES.timezone,
        points_per_visit_enabled: Boolean(v.points_per_visit_enabled),
        points_per_visit:
          typeof v.points_per_visit === "number"
            ? Math.max(0, v.points_per_visit)
            : DEFAULT_VISIT_LOYALTY_RULES.points_per_visit,
        milestone_visits_threshold:
          typeof v.milestone_visits_threshold === "number"
            ? Math.max(1, v.milestone_visits_threshold)
            : DEFAULT_VISIT_LOYALTY_RULES.milestone_visits_threshold,
      };
    }
  } catch {
    // Fallback
  }
  return DEFAULT_VISIT_LOYALTY_RULES;
}

/**
 * Calcula la fecha de la jornada operativa actual (YYYY-MM-DD).
 * Si la hora local (America/Mexico_City) es menor que shift_cutoff_hour (ej. 06:00 AM),
 * la visita pertenece a la jornada iniciada la tarde/noche del día anterior.
 */
export function computeOperationalShiftDate(
  date: Date = new Date(),
  cutoffHour: number = 6,
  timeZone: string = "America/Mexico_City"
): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const year = Number(parts.find((p) => p.type === "year")?.value || date.getUTCFullYear());
    const month = Number(parts.find((p) => p.type === "month")?.value || date.getUTCMonth() + 1);
    const day = Number(parts.find((p) => p.type === "day")?.value || date.getUTCDate());
    const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);

    const localDate = new Date(Date.UTC(year, month - 1, day));
    if (hour < cutoffHour) {
      localDate.setUTCDate(localDate.getUTCDate() - 1);
    }

    return localDate.toISOString().split("T")[0];
  } catch {
    const fallback = new Date(date.getTime() - cutoffHour * 3600 * 1000);
    return fallback.toISOString().split("T")[0];
  }
}

/* ============================================================================
   PERSISTENCIA RESILIENTE EN SUPABASE PARA EMPLEADOS, INVITACIONES Y SESIONES
   Usa las tablas dedicadas (staff_employees, staff_invitations, staff_sessions)
   y respalda automáticamente en admin_config si la migración SQL aún no se corre.
   ============================================================================ */

async function readConfigRegistry<T>(
  supabase: SupabaseAdmin,
  key: string
): Promise<T[]> {
  const { data } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (data?.value && Array.isArray(data.value)) {
    return data.value as T[];
  }
  return [];
}

async function writeConfigRegistry<T>(
  supabase: SupabaseAdmin,
  key: string,
  items: T[],
  description: string
): Promise<void> {
  await supabase.from("admin_config").upsert({
    key,
    value: items,
    description,
    updated_at: new Date().toISOString(),
  });
}

export async function listStaffEmployees(
  supabase: SupabaseAdmin
): Promise<StaffEmployee[]> {
  try {
    const { data, error } = await supabase
      .from("staff_employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data as StaffEmployee[];
    }
  } catch {
    // Fallback a admin_config
  }

  const list = await readConfigRegistry<StaffEmployee>(
    supabase,
    "staff_employees_registry"
  );
  return list.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getStaffEmployeeById(
  supabase: SupabaseAdmin,
  id: string
): Promise<StaffEmployee | null> {
  try {
    const { data, error } = await supabase
      .from("staff_employees")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return data as StaffEmployee;
    }
  } catch {}

  const list = await readConfigRegistry<StaffEmployee>(
    supabase,
    "staff_employees_registry"
  );
  return list.find((e) => e.id === id) || null;
}

export async function findStaffEmployeeByIdentifier(
  supabase: SupabaseAdmin,
  identifier: string
): Promise<StaffEmployee | null> {
  const clean = identifier.trim().toLowerCase();
  const digits = identifier.replace(/\D/g, "");
  const normalizedPhone = digits.length === 10 ? `52${digits}` : digits;

  const all = await listStaffEmployees(supabase);
  return (
    all.find((e) => {
      const empDigits = e.phone.replace(/\D/g, "");
      return (
        e.phone === clean ||
        (normalizedPhone && empDigits === normalizedPhone) ||
        (digits.length >= 10 && empDigits.endsWith(digits.slice(-10))) ||
        (e.username && e.username.toLowerCase() === clean)
      );
    }) || null
  );
}

export async function saveStaffEmployee(
  supabase: SupabaseAdmin,
  employee: StaffEmployee
): Promise<StaffEmployee> {
  // 1. Intentar guardar en tabla dedicada staff_employees
  try {
    const { data, error } = await supabase
      .from("staff_employees")
      .upsert(employee, { onConflict: "id" })
      .select("*")
      .single();

    if (!error && data) {
      // También mantener copia sincronizada en admin_config
      const current = await readConfigRegistry<StaffEmployee>(
        supabase,
        "staff_employees_registry"
      );
      const filtered = current.filter((e) => e.id !== employee.id);
      await writeConfigRegistry(
        supabase,
        "staff_employees_registry",
        [data as StaffEmployee, ...filtered],
        "Registro de empleados autorizados del scanner Club Bacachá"
      );
      return data as StaffEmployee;
    }
  } catch {}

  // 2. Guardar en admin_config en Supabase
  const current = await readConfigRegistry<StaffEmployee>(
    supabase,
    "staff_employees_registry"
  );
  const idx = current.findIndex((e) => e.id === employee.id);
  if (idx >= 0) {
    current[idx] = employee;
  } else {
    current.unshift(employee);
  }

  await writeConfigRegistry(
    supabase,
    "staff_employees_registry",
    current,
    "Registro de empleados autorizados del scanner Club Bacachá"
  );
  return employee;
}

/**
 * Crea un enlace de invitación único, firmado y con vencimiento de 48h para un empleado.
 * Revoca invitaciones pendientes anteriores sin duplicar al empleado.
 */
export async function createStaffInvitation(
  supabase: SupabaseAdmin,
  employeeId: string,
  createdBy: string
): Promise<{ rawToken: string; expiresAt: string; activationUrl: string }> {
  const { rawToken, tokenHash } = createSignedInviteToken(employeeId);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + INVITATION_EXPIRY_HOURS * 3600 * 1000
  ).toISOString();

  const newInvite: StaffInvitationRecord = {
    id: crypto.randomUUID(),
    employee_id: employeeId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    used_at: null,
    revoked: false,
    created_by: createdBy,
    created_at: nowIso,
  };

  // Intentar guardar en staff_invitations
  try {
    await supabase
      .from("staff_invitations")
      .update({ revoked: true })
      .eq("employee_id", employeeId)
      .is("used_at", null);

    await supabase.from("staff_invitations").insert(newInvite);
  } catch {}

  // Respaldar en admin_config
  const invites = await readConfigRegistry<StaffInvitationRecord>(
    supabase,
    "staff_invitations_registry"
  );
  const updatedInvites = invites.map((inv) =>
    inv.employee_id === employeeId && !inv.used_at
      ? { ...inv, revoked: true }
      : inv
  );
  updatedInvites.unshift(newInvite);
  await writeConfigRegistry(
    supabase,
    "staff_invitations_registry",
    updatedInvites.slice(0, 200),
    "Invitaciones firmadas de un solo uso para empleados"
  );

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bacacha.com")
    .replace(/\/+$/, "")
    .replace(/^https:\/\/www\.bacacha\.com$/i, "https://bacacha.com");

  return {
    rawToken,
    expiresAt,
    activationUrl: `${baseUrl}/scanner/activar/${rawToken}`,
  };
}

/**
 * Valida un token de invitación y devuelve el empleado asociado si está vigente y sin usar.
 */
export async function verifyStaffInvitationToken(
  supabase: SupabaseAdmin,
  rawToken: string
): Promise<
  | { valid: true; employee: StaffEmployee; invitation: StaffInvitationRecord }
  | { valid: false; error: string }
> {
  const cleanToken = (rawToken || "").trim();
  if (cleanToken.length < 32) {
    return { valid: false, error: "El enlace de invitación no es válido." };
  }

  const tokenHash = hashSessionToken(cleanToken);
  const nowIso = new Date().toISOString();

  let foundInvite: StaffInvitationRecord | null = null;

  try {
    const { data } = await supabase
      .from("staff_invitations")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (data) foundInvite = data as StaffInvitationRecord;
  } catch {}

  if (!foundInvite) {
    const invites = await readConfigRegistry<StaffInvitationRecord>(
      supabase,
      "staff_invitations_registry"
    );
    foundInvite = invites.find((i) => i.token_hash === tokenHash) || null;
  }

  if (!foundInvite) {
    return {
      valid: false,
      error: "Esta invitación no existe o ya fue reemplazada por una más reciente.",
    };
  }

  if (foundInvite.revoked) {
    return {
      valid: false,
      error:
        "Este enlace de invitación fue revocado porque se generó uno nuevo. Solicita el enlace más reciente al administrador.",
    };
  }

  if (foundInvite.used_at) {
    return {
      valid: false,
      error:
        "Este enlace de activación ya fue utilizado. Ingresa directamente en /scanner con tu contraseña.",
    };
  }

  if (foundInvite.expires_at < nowIso) {
    return {
      valid: false,
      error:
        "Este enlace de activación ha caducado. Solicita al administrador que te reenvíe la invitación por WhatsApp.",
    };
  }

  const employee = await getStaffEmployeeById(supabase, foundInvite.employee_id);
  if (!employee) {
    return { valid: false, error: "Empleado no encontrado." };
  }

  if (employee.status === "INACTIVO") {
    return {
      valid: false,
      error: "Esta cuenta de empleado ha sido desactivada por la administración.",
    };
  }

  return { valid: true, employee, invitation: foundInvite };
}

/**
 * Consume la invitación de un solo uso y activa al empleado con su contraseña hasheada.
 */
export async function activateStaffEmployeeWithToken(
  supabase: SupabaseAdmin,
  rawToken: string,
  newPassword: string,
  ip?: string
): Promise<{ ok: true; employee: StaffEmployee } | { ok: false; error: string }> {
  if (!newPassword || newPassword.length < 8) {
    return {
      ok: false,
      error: "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  const check = await verifyStaffInvitationToken(supabase, rawToken);
  if (!check.valid) {
    return { ok: false, error: check.error };
  }

  const passwordHash = await hashPassword(newPassword);
  const nowIso = new Date().toISOString();

  // Marcar invitación como usada
  try {
    await supabase
      .from("staff_invitations")
      .update({ used_at: nowIso })
      .eq("id", check.invitation.id);
  } catch {}

  const invites = await readConfigRegistry<StaffInvitationRecord>(
    supabase,
    "staff_invitations_registry"
  );
  const updatedInvites = invites.map((inv) =>
    inv.id === check.invitation.id ? { ...inv, used_at: nowIso } : inv
  );
  await writeConfigRegistry(
    supabase,
    "staff_invitations_registry",
    updatedInvites,
    "Invitaciones firmadas de un solo uso para empleados"
  );

  // Actualizar empleado a ACTIVO
  const updatedEmployee: StaffEmployee = {
    ...check.employee,
    status: "ACTIVO",
    password_hash: passwordHash,
    must_change_password: false,
    temp_password_expires_at: null,
    updated_at: nowIso,
  };

  const saved = await saveStaffEmployee(supabase, updatedEmployee);

  await logAdminAudit(
    "STAFF_ACCOUNT_ACTIVATED",
    {
      employeeId: saved.id,
      employeeName: saved.name,
      role: saved.role,
    },
    {
      actorName: saved.name,
      targetType: "staff_employee",
      targetId: saved.id,
      ip,
    }
  );

  return { ok: true, employee: saved };
}

/* ============================================================================
   AUTENTICACIÓN Y SESIONES DE SCANNER (/scanner)
   ============================================================================ */

export async function loginScannerStaff(
  identifier: string,
  password: string,
  ip = "unknown",
  userAgent = "unknown"
): Promise<
  | {
      ok: true;
      token: string;
      employee: StaffEmployee;
      mustChangePassword: boolean;
    }
  | { ok: false; error: string }
> {
  const lockKey = `${ip}:${identifier.trim().toLowerCase()}`;
  const attemptRecord = SCANNER_FAILED_ATTEMPTS[lockKey];
  if (attemptRecord && Date.now() < attemptRecord.lockedUntil) {
    return {
      ok: false,
      error:
        "Demasiados intentos fallidos. Por seguridad, espera 5 minutos antes de volver a intentar.",
    };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false, error: "Servicio de base de datos no disponible." };
  }

  const employee = await findStaffEmployeeByIdentifier(supabase, identifier);
  if (!employee) {
    const rec = SCANNER_FAILED_ATTEMPTS[lockKey] || { count: 0, lockedUntil: 0 };
    rec.count += 1;
    if (rec.count >= MAX_LOGIN_FAILURES) {
      rec.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    }
    SCANNER_FAILED_ATTEMPTS[lockKey] = rec;
    return { ok: false, error: "Credenciales de acceso incorrectas." };
  }

  if (employee.status === "INACTIVO") {
    return {
      ok: false,
      error:
        "Tu acceso al scanner se encuentra desactivado. Contacta al gerente o administrador.",
    };
  }

  if (!employee.password_hash) {
    return {
      ok: false,
      error:
        "Tu cuenta aún está pendiente de activación. Abre primero el enlace de invitación enviado a tu WhatsApp.",
    };
  }

  // Si tenía contraseña temporal, verificar que no haya caducado
  if (
    employee.must_change_password &&
    employee.temp_password_expires_at &&
    new Date(employee.temp_password_expires_at) < new Date()
  ) {
    return {
      ok: false,
      error:
        "Tu contraseña temporal ha expirado. Solicita al administrador un nuevo restablecimiento de acceso.",
    };
  }

  const valid = await verifyPassword(password, employee.password_hash);
  if (!valid) {
    const rec = SCANNER_FAILED_ATTEMPTS[lockKey] || { count: 0, lockedUntil: 0 };
    rec.count += 1;
    if (rec.count >= MAX_LOGIN_FAILURES) {
      rec.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    }
    SCANNER_FAILED_ATTEMPTS[lockKey] = rec;

    await logAdminAudit(
      "SCANNER_LOGIN_FAILED",
      { employeeId: employee.id, employeeName: employee.name },
      { actorName: employee.name, targetType: "staff_employee", targetId: employee.id, ip }
    );
    return { ok: false, error: "Credenciales de acceso incorrectas." };
  }

  delete SCANNER_FAILED_ATTEMPTS[lockKey];

  const nowIso = new Date().toISOString();
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(
    Date.now() + SCANNER_SESSION_HOURS * 3600 * 1000
  ).toISOString();

  const newSession: StaffSessionRecord = {
    id: crypto.randomUUID(),
    employee_id: employee.id,
    token_hash: tokenHash,
    ip_address: ip,
    user_agent: userAgent,
    expires_at: expiresAt,
    revoked: false,
    created_at: nowIso,
  };

  try {
    await supabase.from("staff_sessions").insert(newSession);
  } catch {}

  const sessions = await readConfigRegistry<StaffSessionRecord>(
    supabase,
    "staff_sessions_registry"
  );
  sessions.unshift(newSession);
  await writeConfigRegistry(
    supabase,
    "staff_sessions_registry",
    sessions.slice(0, 300),
    "Sesiones activas de empleados en /scanner"
  );

  const updatedEmp = await saveStaffEmployee(supabase, {
    ...employee,
    status: "ACTIVO",
    last_login_at: nowIso,
    last_active_at: nowIso,
    updated_at: nowIso,
  });

  await logAdminAudit(
    "SCANNER_LOGIN_SUCCESS",
    { employeeId: employee.id, role: employee.role },
    { actorName: employee.name, targetType: "staff_employee", targetId: employee.id, ip }
  );

  return {
    ok: true,
    token: rawToken,
    employee: updatedEmp,
    mustChangePassword: Boolean(updatedEmp.must_change_password),
  };
}

export async function getScannerSession(
  req?: NextRequest
): Promise<{ employee: StaffEmployee; sessionId: string } | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  let rawToken: string | undefined;
  if (req) {
    rawToken = req.cookies.get(SCANNER_COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      rawToken = cookieStore.get(SCANNER_COOKIE_NAME)?.value;
    } catch {}
  }

  if (!rawToken || rawToken.length < 32) return null;

  const tokenHash = hashSessionToken(rawToken);
  const nowIso = new Date().toISOString();

  let foundSession: StaffSessionRecord | null = null;
  try {
    const { data } = await supabase
      .from("staff_sessions")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("revoked", false)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (data) foundSession = data as StaffSessionRecord;
  } catch {}

  if (!foundSession) {
    const sessions = await readConfigRegistry<StaffSessionRecord>(
      supabase,
      "staff_sessions_registry"
    );
    foundSession =
      sessions.find(
        (s) =>
          s.token_hash === tokenHash && !s.revoked && s.expires_at > nowIso
      ) || null;
  }

  if (!foundSession) return null;

  const employee = await getStaffEmployeeById(supabase, foundSession.employee_id);
  if (!employee || employee.status !== "ACTIVO") {
    return null;
  }

  return {
    employee,
    sessionId: foundSession.id,
  };
}

export async function revokeAllEmployeeSessions(
  supabase: SupabaseAdmin,
  employeeId: string
): Promise<void> {
  try {
    await supabase
      .from("staff_sessions")
      .update({ revoked: true })
      .eq("employee_id", employeeId);
  } catch {}

  const sessions = await readConfigRegistry<StaffSessionRecord>(
    supabase,
    "staff_sessions_registry"
  );
  const updated = sessions.map((s) =>
    s.employee_id === employeeId ? { ...s, revoked: true } : s
  );
  await writeConfigRegistry(
    supabase,
    "staff_sessions_registry",
    updated,
    "Sesiones activas de empleados en /scanner"
  );
}

export async function logoutScannerSession(
  rawToken?: string,
  ip?: string
): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase || !rawToken) return;

  const tokenHash = hashSessionToken(rawToken);

  try {
    await supabase
      .from("staff_sessions")
      .update({ revoked: true })
      .eq("token_hash", tokenHash);
  } catch {}

  const sessions = await readConfigRegistry<StaffSessionRecord>(
    supabase,
    "staff_sessions_registry"
  );
  const target = sessions.find((s) => s.token_hash === tokenHash);
  const updated = sessions.map((s) =>
    s.token_hash === tokenHash ? { ...s, revoked: true } : s
  );
  await writeConfigRegistry(
    supabase,
    "staff_sessions_registry",
    updated,
    "Sesiones activas de empleados en /scanner"
  );

  if (target) {
    await logAdminAudit(
      "SCANNER_LOGOUT",
      { employeeId: target.employee_id },
      { targetType: "staff_session", targetId: target.id, ip }
    );
  }
}

/* ============================================================================
   EXTRACCIÓN SEGURA DE TOKEN QR DESDE TEXTO ESCANEADO
   ============================================================================ */

export function extractQrTokenFromScan(rawInput: string): string {
  const trimmed = (rawInput || "").trim();
  if (!trimmed) return "";

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      // Soporta /m/{token} y /member/verify/{token}
      const mIdx = parts.indexOf("m");
      if (mIdx >= 0 && parts[mIdx + 1]) {
        return decodeURIComponent(parts[mIdx + 1]).trim();
      }
      const verifyIdx = parts.indexOf("verify");
      if (verifyIdx >= 0 && parts[verifyIdx + 1]) {
        return decodeURIComponent(parts[verifyIdx + 1]).trim();
      }
      return parts[parts.length - 1] || trimmed;
    }
  } catch {
    // No es URL completa
  }

  const mMatch = trimmed.match(/\/(?:m|verify)\/([a-zA-Z0-9_-]+)/);
  if (mMatch?.[1]) {
    return mMatch[1].trim();
  }

  return trimmed;
}

/* ============================================================================
   CONSULTA DE VISITA EN JORNADA ACTUAL Y REGISTRO ATÓMICO DE VISITA
   ============================================================================ */

export interface ShiftVisitInfo {
  alreadyRegisteredInShift: boolean;
  shiftDate: string;
  firstVisitAt: string | null;
  firstEmployeeName: string | null;
  firstEmployeeRole: string | null;
}

/**
 * Comprueba si el miembro ya tiene una visita registrada en la jornada operativa actual (shiftDate).
 */
export async function checkMemberVisitInShift(
  supabase: SupabaseAdmin,
  memberId: string,
  shiftDate: string
): Promise<ShiftVisitInfo> {
  // 1. Consultar member_visits si existe
  try {
    const { data: vRow, error } = await supabase
      .from("member_visits")
      .select("id, visited_at, employee_name, employee_role, shift_date")
      .eq("member_id", memberId)
      .eq("shift_date", shiftDate)
      .maybeSingle();

    if (!error && vRow) {
      return {
        alreadyRegisteredInShift: true,
        shiftDate,
        firstVisitAt: vRow.visited_at,
        firstEmployeeName: vRow.employee_name,
        firstEmployeeRole: vRow.employee_role,
      };
    }
  } catch {}

  // 2. Consultar en member_activity (VISIT_REGISTERED con metadata.shift_date === shiftDate)
  const { data: actRows } = await supabase
    .from("member_activity")
    .select("id, metadata, created_at")
    .eq("member_id", memberId)
    .eq("activity_type", "VISIT_REGISTERED")
    .order("created_at", { ascending: true });

  const rules = await getVisitLoyaltyRules(supabase);

  for (const row of actRows || []) {
    const meta = (row.metadata || {}) as Record<string, any>;
    const rowShift =
      meta.shift_date ||
      computeOperationalShiftDate(
        new Date(row.created_at),
        rules.shift_cutoff_hour,
        rules.timezone
      );

    if (rowShift === shiftDate) {
      return {
        alreadyRegisteredInShift: true,
        shiftDate,
        firstVisitAt: meta.visited_at || row.created_at,
        firstEmployeeName:
          meta.employee_name || meta.verified_by || "Personal Club Bacachá",
        firstEmployeeRole: meta.employee_role || "STAFF",
      };
    }
  }

  return {
    alreadyRegisteredInShift: false,
    shiftDate,
    firstVisitAt: null,
    firstEmployeeName: null,
    firstEmployeeRole: null,
  };
}

/**
 * Registra de forma atómica una visita en la jornada operativa actual para un socio,
 * evitando duplicados por escaneos simultáneos y actualizando empleado, socio y CRM.
 */
export async function registerAtomicStaffVisit(params: {
  qrToken: string;
  employee: { id: string; name: string; role: string };
  ip?: string;
}): Promise<
  | {
      ok: true;
      duplicate: false;
      shiftDate: string;
      visitedAt: string;
      visitNumber: number;
      pointsAwarded: number;
      employeeName: string;
      employeeRole: string;
      ficha: MemberQrFicha;
    }
  | {
      ok: true;
      duplicate: true;
      shiftDate: string;
      firstVisitAt: string;
      firstEmployeeName: string;
      firstEmployeeRole: string;
      ficha: MemberQrFicha;
    }
  | {
      ok: false;
      error: string;
      code: "INVALID_QR" | "INACTIVE_MEMBER" | "DB_ERROR";
      ficha?: MemberQrFicha | null;
    }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Base de datos no disponible",
      code: "DB_ERROR",
    };
  }

  const cleanToken = extractQrTokenFromScan(params.qrToken);
  if (!cleanToken) {
    return {
      ok: false,
      error: "Código QR vacío o no válido.",
      code: "INVALID_QR",
    };
  }

  const fichaBefore = await getMemberQrFichaByToken(cleanToken, {
    recordScan: false,
  });

  if (!fichaBefore) {
    return {
      ok: false,
      error:
        "TOKEN QR NO VÁLIDO O REVOCADO. Esta credencial no corresponde a ningún socio registrado o fue revocada.",
      code: "INVALID_QR",
    };
  }

  if (!fichaBefore.member.is_active) {
    return {
      ok: false,
      error: `La membresía de ${fichaBefore.member.full_name} (${fichaBefore.member.formatted_number}) está INACTIVA (${fichaBefore.member.status}).`,
      code: "INACTIVE_MEMBER",
      ficha: fichaBefore,
    };
  }

  const rules = await getVisitLoyaltyRules(supabase);
  const shiftDate = computeOperationalShiftDate(
    new Date(),
    rules.shift_cutoff_hour,
    rules.timezone
  );

  const lockKey = `${fichaBefore.member.id}:${shiftDate}`;

  // Serializar operaciones simultáneas para el mismo socio y jornada
  const existingPromise = IN_FLIGHT_VISIT_LOCKS.get(lockKey);
  if (existingPromise) {
    await existingPromise.catch(() => {});
  }

  const executionPromise = (async () => {
    // 1. Comprobar si ya existe visita registrada en esta misma jornada
    const shiftCheck = await checkMemberVisitInShift(
      supabase,
      fichaBefore.member.id,
      shiftDate
    );

    if (shiftCheck.alreadyRegisteredInShift) {
      return {
        ok: true as const,
        duplicate: true as const,
        shiftDate,
        firstVisitAt: shiftCheck.firstVisitAt || new Date().toISOString(),
        firstEmployeeName:
          shiftCheck.firstEmployeeName || params.employee.name,
        firstEmployeeRole:
          shiftCheck.firstEmployeeRole || params.employee.role,
        ficha: fichaBefore,
      };
    }

    const nowIso = new Date().toISOString();
    const newVisitNumber = fichaBefore.stats.total_visits + 1;
    const pointsToAward = rules.points_per_visit_enabled
      ? rules.points_per_visit
      : 0;

    // 2. Intentar insertar en member_visits con restricción UNIQUE (member_id, shift_date)
    try {
      const { error: insertVisitErr } = await supabase
        .from("member_visits")
        .insert({
          member_id: fichaBefore.member.id,
          employee_id: params.employee.id.startsWith("admin_")
            ? null
            : params.employee.id,
          employee_name: params.employee.name,
          employee_role: params.employee.role,
          shift_date: shiftDate,
          visit_number: newVisitNumber,
          points_awarded: pointsToAward,
          qr_token_used: `${cleanToken.substring(0, 8)}...`,
          visited_at: nowIso,
        });

      // Si otro proceso simultáneo insertó justo antes (código PostgreSQL 23505 unique_violation)
      if (insertVisitErr && insertVisitErr.code === "23505") {
        const recheck = await checkMemberVisitInShift(
          supabase,
          fichaBefore.member.id,
          shiftDate
        );
        return {
          ok: true as const,
          duplicate: true as const,
          shiftDate,
          firstVisitAt: recheck.firstVisitAt || nowIso,
          firstEmployeeName:
            recheck.firstEmployeeName || params.employee.name,
          firstEmployeeRole:
            recheck.firstEmployeeRole || params.employee.role,
          ficha: fichaBefore,
        };
      }
    } catch {
      // Respaldado en member_activity
    }

    // 3. Registrar en member_activity (fuente universal del historial del socio en el CRM)
    await supabase.from("member_activity").insert({
      member_id: fichaBefore.member.id,
      activity_type: "VISIT_REGISTERED",
      metadata: {
        shift_date: shiftDate,
        visited_at: nowIso,
        visit_number: newVisitNumber,
        employee_id: params.employee.id,
        employee_name: params.employee.name,
        employee_role: params.employee.role,
        verified_by: `${params.employee.name} (${params.employee.role})`,
        points_awarded: pointsToAward,
        note: `Visita #${newVisitNumber} registrada en scanner por ${params.employee.name}`,
      },
    });

    // 4. Actualizar contadores del socio en member_engagement_scores
    const { data: currentScore } = await supabase
      .from("member_engagement_scores")
      .select("*")
      .eq("member_id", fichaBefore.member.id)
      .maybeSingle();

    const currentTotalScore = Number(currentScore?.total_score ?? 5);
    const newTotalScore = currentTotalScore + pointsToAward;

    let newCategory = currentScore?.category || "NUEVO_MIEMBRO";
    if (newCategory !== "EMBAJADOR_CLUB") {
      if (newVisitNumber >= rules.milestone_visits_threshold || newTotalScore >= 50) {
        newCategory = "MIEMBRO_DESTACADO";
      } else if (newVisitNumber >= 2 || newTotalScore >= 20) {
        newCategory = "MIEMBRO_PARTICIPATIVO";
      }
    }

    await supabase.from("member_engagement_scores").upsert(
      {
        member_id: fichaBefore.member.id,
        total_score: newTotalScore,
        score_30d: Number(currentScore?.score_30d ?? 5) + pointsToAward,
        score_60d: Number(currentScore?.score_60d ?? 5) + pointsToAward,
        score_90d: Number(currentScore?.score_90d ?? 5) + pointsToAward,
        events_attended_count: newVisitNumber,
        category: newCategory,
        last_activity_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "member_id" }
    );

    // 5. Si la regla de puntos por visita está activa por el dueño, registrar en el libro loyalty_transactions
    if (pointsToAward > 0) {
      try {
        const { data: lastTx } = await supabase
          .from("loyalty_transactions")
          .select("balance_after")
          .eq("member_id", fichaBefore.member.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const prevBal = lastTx && typeof lastTx.balance_after === "number" ? lastTx.balance_after : 0;
        await supabase.from("loyalty_transactions").insert({
          member_id: fichaBefore.member.id,
          amount: pointsToAward,
          balance_after: prevBal + pointsToAward,
          type: "EVENT_ATTENDANCE",
          description: `Visita #${newVisitNumber} en Club Bacachá (Jornada ${shiftDate})`,
          metadata: {
            shift_date: shiftDate,
            visit_number: newVisitNumber,
            employee_id: params.employee.id,
            employee_name: params.employee.name,
          },
          created_by: params.employee.name,
        });
      } catch {}
    }

    // 6. Actualizar contador de visitas registradas del empleado
    const staffEmp = await getStaffEmployeeById(supabase, params.employee.id);
    if (staffEmp) {
      await saveStaffEmployee(supabase, {
        ...staffEmp,
        visits_registered_count: (staffEmp.visits_registered_count || 0) + 1,
        last_active_at: nowIso,
        updated_at: nowIso,
      });
    }

    // 7. Auditoría administrativa
    await logAdminAudit(
      "SCANNER_VISIT_REGISTERED",
      {
        memberId: fichaBefore.member.id,
        memberNumber: fichaBefore.member.member_number,
        memberName: fichaBefore.member.full_name,
        shiftDate,
        visitNumber: newVisitNumber,
        pointsAwarded: pointsToAward,
        employeeId: params.employee.id,
        employeeName: params.employee.name,
        employeeRole: params.employee.role,
      },
      {
        actorName: `${params.employee.name} (${params.employee.role})`,
        targetType: "member",
        targetId: fichaBefore.member.id,
        ip: params.ip,
      }
    );

    const updatedFicha =
      (await getMemberQrFichaByToken(cleanToken, { recordScan: false })) ||
      fichaBefore;

    return {
      ok: true as const,
      duplicate: false as const,
      shiftDate,
      visitedAt: nowIso,
      visitNumber: newVisitNumber,
      pointsAwarded: pointsToAward,
      employeeName: params.employee.name,
      employeeRole: params.employee.role,
      ficha: updatedFicha,
    };
  })();

  IN_FLIGHT_VISIT_LOCKS.set(lockKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    IN_FLIGHT_VISIT_LOCKS.delete(lockKey);
  }
}
