import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword, verifyPassword, generateSessionToken, hashSessionToken } from "./crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "bacacha_admin_token";
const SESSION_EXPIRY_HOURS = 24;

// Simple in-memory brute force protection tracking (resets on process restart, backed by audit log)
const FAILED_ATTEMPTS: Record<string, { count: number; lockedUntil: number }> = {};
const MAX_FAILURES = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MARKETING" | "OPERATOR";
  active: boolean;
  last_login_at?: string;
}

export interface AdminSessionInfo {
  user: AdminUser;
  sessionId: string;
  expiresAt: string;
}

/**
 * Check if the initial setup has been performed (i.e. does any admin exist?).
 */
export async function isAdminSetupNeeded(): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;

  const { count, error } = await supabase
    .from("admin_users")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error checking admin_users:", error);
    return false;
  }

  return (count ?? 0) === 0;
}

/**
 * Check if an IP address is currently locked out due to repeated failures.
 */
export function isIpLockedOut(ip: string): boolean {
  const record = FAILED_ATTEMPTS[ip];
  if (!record) return false;
  if (Date.now() < record.lockedUntil) return true;
  delete FAILED_ATTEMPTS[ip];
  return false;
}

function recordFailedAttempt(ip: string) {
  const record = FAILED_ATTEMPTS[ip] || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= MAX_FAILURES) {
    record.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  FAILED_ATTEMPTS[ip] = record;
}

function clearFailedAttempts(ip: string) {
  delete FAILED_ATTEMPTS[ip];
}

/**
 * Setup the initial administrative password. Allowed ONLY if no admin user exists.
 */
export async function setupInitialAdmin(password: string, ip?: string, userAgent?: string): Promise<{ token: string; user: AdminUser } | { error: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { error: "Servicio de base de datos no disponible" };

  const needed = await isAdminSetupNeeded();
  if (!needed) {
    return { error: "La configuración inicial ya fue completada previamente" };
  }

  if (!password || password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  const hashedPassword = await hashPassword(password);

  const { data: newUser, error: createErr } = await supabase
    .from("admin_users")
    .insert({
      username: "admin",
      password_hash: hashedPassword,
      name: "Administrador Compartido",
      role: "SUPER_ADMIN",
      active: true,
      last_login_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (createErr || !newUser) {
    console.error("Error creating initial admin:", createErr);
    return { error: "No se pudo registrar la contraseña inicial" };
  }

  // Create session
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 3600 * 1000).toISOString();

  await supabase.from("admin_sessions").insert({
    admin_user_id: newUser.id,
    token_hash: tokenHash,
    ip_address: ip || null,
    user_agent: userAgent || null,
    expires_at: expiresAt,
  });

  // Audit log
  await supabase.from("admin_audit_logs").insert({
    admin_user_id: newUser.id,
    actor_name: "administrador compartido",
    action: "INITIAL_PASSWORD_SETUP",
    target_type: "admin_user",
    target_id: newUser.id,
    details: { message: "Contraseña inicial configurada exitosamente" },
    ip_address: ip || null,
  });

  return {
    token: rawToken,
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      active: newUser.active,
      last_login_at: newUser.last_login_at,
    },
  };
}

/**
 * Authenticate using administrative password.
 */
export async function loginAdmin(
  password: string,
  ip = "unknown",
  userAgent = "unknown"
): Promise<{ token: string; user: AdminUser } | { error: string; locked?: boolean }> {
  if (isIpLockedOut(ip)) {
    return { error: "Demasiados intentos fallidos. Por seguridad, espera 5 minutos.", locked: true };
  }

  const supabase = createAdminClient();
  if (!supabase) return { error: "Base de datos no disponible" };

  // Fetch the active admin user (or shared admin)
  const { data: admins, error: fetchErr } = await supabase
    .from("admin_users")
    .select("*")
    .eq("active", true)
    .limit(1);

  if (fetchErr || !admins || admins.length === 0) {
    const needed = await isAdminSetupNeeded();
    if (needed) {
      return { error: "Es necesario configurar la contraseña inicial" };
    }
    return { error: "No existen administradores activos configurados" };
  }

  const admin = admins[0];
  const valid = await verifyPassword(password, admin.password_hash);

  if (!valid) {
    recordFailedAttempt(ip);
    await supabase.from("admin_audit_logs").insert({
      actor_name: "administrador compartido",
      action: "LOGIN_FAILED",
      target_type: "admin_user",
      target_id: admin.id,
      details: { reason: "Contraseña incorrecta", attempts: FAILED_ATTEMPTS[ip]?.count || 1 },
      ip_address: ip,
    });
    return { error: "Contraseña incorrecta" };
  }

  clearFailedAttempts(ip);

  // Update last login
  await supabase
    .from("admin_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", admin.id);

  // Generate session
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 3600 * 1000).toISOString();

  await supabase.from("admin_sessions").insert({
    admin_user_id: admin.id,
    token_hash: tokenHash,
    ip_address: ip,
    user_agent: userAgent,
    expires_at: expiresAt,
  });

  // Audit log
  await supabase.from("admin_audit_logs").insert({
    admin_user_id: admin.id,
    actor_name: admin.name || "administrador compartido",
    action: "LOGIN_SUCCESS",
    target_type: "admin_session",
    details: { expiresAt },
    ip_address: ip,
  });

  return {
    token: rawToken,
    user: {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      active: admin.active,
      last_login_at: admin.last_login_at,
    },
  };
}

/**
 * Validate session from request or cookies.
 */
export async function getAdminSession(req?: NextRequest): Promise<AdminSessionInfo | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  let rawToken: string | undefined;

  if (req) {
    rawToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!rawToken) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        rawToken = authHeader.substring(7);
      }
    }
  } else {
    try {
      const cookieStore = await cookies();
      rawToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    } catch {
      // not in request context
    }
  }

  if (!rawToken || rawToken.length < 32) return null;

  const tokenHash = hashSessionToken(rawToken);

  const { data: session, error } = await supabase
    .from("admin_sessions")
    .select(`
      id,
      expires_at,
      revoked,
      admin_users:admin_user_id (
        id,
        username,
        name,
        role,
        active
      )
    `)
    .eq("token_hash", tokenHash)
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !session || !session.admin_users) {
    return null;
  }

  // Next.js typed join return
  const adminUser = session.admin_users as unknown as AdminUser;
  if (!adminUser.active) return null;

  return {
    user: adminUser,
    sessionId: session.id,
    expiresAt: session.expires_at,
  };
}

/**
 * Logout and revoke current session.
 */
export async function logoutAdmin(rawToken?: string, ip?: string): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase || !rawToken) return false;

  const tokenHash = hashSessionToken(rawToken);

  const { data: session } = await supabase
    .from("admin_sessions")
    .update({ revoked: true })
    .eq("token_hash", tokenHash)
    .select("admin_user_id")
    .single();

  await supabase.from("admin_audit_logs").insert({
    admin_user_id: session?.admin_user_id || null,
    actor_name: "administrador compartido",
    action: "LOGOUT",
    target_type: "admin_session",
    details: { tokenHash: tokenHash.substring(0, 10) + "..." },
    ip_address: ip || null,
  });

  return true;
}

/**
 * Change admin password and revoke all existing sessions.
 */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
  adminId: string,
  ip?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { success: false, error: "Base de datos no disponible" };

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "La nueva contraseña debe tener al menos 8 caracteres" };
  }

  const { data: admin, error: fetchErr } = await supabase
    .from("admin_users")
    .select("id, password_hash")
    .eq("id", adminId)
    .single();

  if (fetchErr || !admin) {
    return { success: false, error: "Administrador no encontrado" };
  }

  const valid = await verifyPassword(currentPassword, admin.password_hash);
  if (!valid) {
    return { success: false, error: "La contraseña actual es incorrecta" };
  }

  const newHash = await hashPassword(newPassword);

  // Update password
  await supabase
    .from("admin_users")
    .update({ password_hash: newHash, updated_at: new Date().toISOString() })
    .eq("id", adminId);

  // Revoke ALL active sessions for security
  await supabase
    .from("admin_sessions")
    .update({ revoked: true })
    .eq("admin_user_id", adminId);

  // Audit log
  await supabase.from("admin_audit_logs").insert({
    admin_user_id: adminId,
    actor_name: "administrador compartido",
    action: "PASSWORD_CHANGED",
    target_type: "admin_user",
    target_id: adminId,
    details: { message: "Contraseña administrativa cambiada y sesiones previas revocadas" },
    ip_address: ip || null,
  });

  return { success: true };
}

/**
 * Log an administrative audit action.
 */
export async function logAdminAudit(
  action: string,
  details: Record<string, unknown> = {},
  options?: {
    actorName?: string;
    adminUserId?: string;
    targetType?: string;
    targetId?: string;
    ip?: string;
  }
) {
  const supabase = createAdminClient();
  if (!supabase) return;

  await supabase.from("admin_audit_logs").insert({
    admin_user_id: options?.adminUserId || null,
    actor_name: options?.actorName || "administrador compartido",
    action,
    target_type: options?.targetType || null,
    target_id: options?.targetId || null,
    details,
    ip_address: options?.ip || null,
  });
}
