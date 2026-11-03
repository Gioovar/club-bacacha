import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_WELCOME_TEMPLATE,
  WelcomeChannel,
  WelcomeHistoryRecord,
  WelcomeStatus,
} from "./welcome";

type SupabaseAdmin = NonNullable<ReturnType<typeof createAdminClient>>;

/**
 * Obtiene la plantilla general de bienvenida desde admin_config en Supabase.
 */
export async function getGeneralWelcomeTemplate(
  supabase: SupabaseAdmin
): Promise<string> {
  try {
    const { data } = await supabase
      .from("admin_config")
      .select("value")
      .eq("key", "welcome_message_template")
      .maybeSingle();

    if (data?.value) {
      if (typeof data.value === "string" && data.value.trim().length > 0) {
        return data.value;
      }
      if (
        typeof data.value === "object" &&
        data.value !== null &&
        "text" in data.value &&
        typeof (data.value as { text?: unknown }).text === "string" &&
        (data.value as { text: string }).text.trim().length > 0
      ) {
        return (data.value as { text: string }).text;
      }
    }
  } catch {
    // Fallback silencioso a la plantilla predeterminada
  }
  return DEFAULT_WELCOME_TEMPLATE;
}

/**
 * Asegura que el miembro tenga un qr_token único y persistente en Supabase.
 * Si ya tiene uno, lo conserva intacto.
 */
export async function ensureMemberQrToken(
  supabase: SupabaseAdmin,
  member: { id: string; qr_token?: string | null }
): Promise<string> {
  if (member.qr_token && member.qr_token.trim().length >= 16) {
    return member.qr_token.trim();
  }

  let newQrToken = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomBytes(24).toString("hex");
    const { data: existing } = await supabase
      .from("members")
      .select("id")
      .eq("qr_token", candidate)
      .maybeSingle();

    if (!existing) {
      newQrToken = candidate;
      break;
    }
  }

  if (!newQrToken) {
    throw new Error("No fue posible asignar un token QR único al miembro.");
  }

  const { data: updated, error } = await supabase
    .from("members")
    .update({ qr_token: newQrToken })
    .eq("id", member.id)
    .select("qr_token")
    .single();

  if (error || !updated?.qr_token) {
    throw new Error(error?.message || "No se pudo persistir el token QR del miembro.");
  }

  return updated.qr_token;
}

/**
 * Registra un evento de bienvenida en Supabase (tanto en member_welcome_logs si existe
 * como en communication_logs y member_activity para compatibilidad total en producción).
 */
export async function recordWelcomeEvent(
  supabase: SupabaseAdmin,
  params: {
    memberId: string;
    phone: string | null;
    adminUserId: string | null;
    actorName: string;
    channel: WelcomeChannel;
    status: WelcomeStatus;
    lastMessage: string;
    credentialGeneratedAt?: string;
    sentAt?: string | null;
    providerMessageId?: string | null;
    extraMetadata?: Record<string, unknown>;
  }
): Promise<WelcomeHistoryRecord> {
  const nowIso = new Date().toISOString();
  const credentialGeneratedAt = params.credentialGeneratedAt || nowIso;
  const sentAt =
    params.sentAt !== undefined
      ? params.sentAt
      : params.status === "enviado" || params.status === "entregado"
      ? nowIso
      : null;

  const metadataPayload = {
    type: "WELCOME_CREDENTIAL",
    welcome_status: params.status,
    channel_used: params.channel,
    admin_user_id: params.adminUserId,
    actor_name: params.actorName,
    credential_generated_at: credentialGeneratedAt,
    sent_at: sentAt,
    provider_message_id: params.providerMessageId || null,
    last_message: params.lastMessage,
    ...(params.extraMetadata || {}),
  };

  let welcomeLogId = "";

  // 1. Intentar registrar en member_welcome_logs (si la migración ya fue aplicada)
  try {
    const { data: wLog, error: wErr } = await supabase
      .from("member_welcome_logs")
      .insert({
        member_id: params.memberId,
        admin_user_id: params.adminUserId,
        actor_name: params.actorName,
        credential_generated_at: credentialGeneratedAt,
        sent_at: sentAt,
        channel: params.channel,
        status: params.status,
        last_message: params.lastMessage,
        provider_message_id: params.providerMessageId || null,
        metadata: metadataPayload,
      })
      .select("id")
      .single();

    if (!wErr && wLog?.id) {
      welcomeLogId = wLog.id;
    }
  } catch {
    // Si member_welcome_logs aún no existe en la BD remota, se respalda en communication_logs
  }

  // 2. Registrar en communication_logs (tabla garantizada en producción)
  const { data: commLog } = await supabase
    .from("communication_logs")
    .insert({
      member_id: params.memberId,
      channel: "WHATSAPP_CLICK",
      template_slug: "bienvenida_credencial",
      message_preview: params.lastMessage,
      phone: params.phone || null,
      actor_name: params.actorName,
      metadata: metadataPayload,
    })
    .select("id, created_at")
    .single();

  if (!welcomeLogId && commLog?.id) {
    welcomeLogId = commLog.id;
  }

  // 3. Registrar en member_activity
  await supabase.from("member_activity").insert({
    member_id: params.memberId,
    activity_type:
      params.status === "enviado" || params.status === "entregado"
        ? "WELCOME_CREDENTIAL_SENT"
        : params.status === "preparado"
        ? "WELCOME_CREDENTIAL_PREPARED"
        : "WELCOME_CREDENTIAL_GENERATED",
    metadata: {
      status: params.status,
      channel: params.channel,
      actor_name: params.actorName,
      sent_at: sentAt,
    },
  });

  return {
    id: welcomeLogId || nowIso,
    member_id: params.memberId,
    admin_user_id: params.adminUserId,
    actor_name: params.actorName,
    credential_generated_at: credentialGeneratedAt,
    sent_at: sentAt,
    channel: params.channel,
    status: params.status,
    last_message: params.lastMessage,
    provider_message_id: params.providerMessageId || null,
    created_at: commLog?.created_at || nowIso,
  };
}

/**
 * Obtiene el historial de bienvenidas de un miembro desde Supabase.
 */
export async function getMemberWelcomeHistory(
  supabase: SupabaseAdmin,
  memberId: string
): Promise<WelcomeHistoryRecord[]> {
  // 1. Intentar leer de member_welcome_logs primero
  try {
    const { data: wLogs, error: wErr } = await supabase
      .from("member_welcome_logs")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!wErr && wLogs && wLogs.length > 0) {
      return wLogs.map((row: any) => ({
        id: row.id,
        member_id: row.member_id,
        admin_user_id: row.admin_user_id,
        actor_name: row.actor_name,
        credential_generated_at: row.credential_generated_at || row.created_at,
        sent_at: row.sent_at || null,
        channel: (row.channel as WelcomeChannel) || "WHATSAPP_MANUAL",
        status: (row.status as WelcomeStatus) || "preparado",
        last_message: row.last_message || "",
        provider_message_id: row.provider_message_id || null,
        created_at: row.created_at,
      }));
    }
  } catch {
    // Fallback a communication_logs
  }

  // 2. Leer desde communication_logs (template_slug = 'bienvenida_credencial')
  const { data: commLogs } = await supabase
    .from("communication_logs")
    .select("*")
    .eq("member_id", memberId)
    .eq("template_slug", "bienvenida_credencial")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!commLogs || commLogs.length === 0) {
    return [];
  }

  return commLogs.map((c: any) => {
    const meta = c.metadata || {};
    return {
      id: c.id,
      member_id: c.member_id,
      admin_user_id: meta.admin_user_id || null,
      actor_name: c.actor_name || meta.actor_name || "Administrador Compartido",
      credential_generated_at: meta.credential_generated_at || c.created_at,
      sent_at: meta.sent_at || null,
      channel: (meta.channel_used as WelcomeChannel) || "WHATSAPP_MANUAL",
      status: (meta.welcome_status as WelcomeStatus) || "preparado",
      last_message: c.message_preview || meta.last_message || "",
      provider_message_id: meta.provider_message_id || null,
      created_at: c.created_at,
    };
  });
}

/**
 * Obtiene un resumen del estado de bienvenida para un conjunto de miembros (para el directorio).
 * Un miembro se marca como `welcome_confirmed = true` ÚNICAMENTE cuando existe al menos un
 * envío con estado confirmado ('enviado' o 'entregado').
 */
export async function getWelcomeSummaryByMemberIds(
  supabase: SupabaseAdmin,
  memberIds: string[]
): Promise<
  Record<
    string,
    {
      status: WelcomeStatus;
      confirmed: boolean;
      sent_at: string | null;
      actor_name: string;
      channel: WelcomeChannel;
      last_message: string;
      updated_at: string;
    }
  >
> {
  const result: Record<
    string,
    {
      status: WelcomeStatus;
      confirmed: boolean;
      sent_at: string | null;
      actor_name: string;
      channel: WelcomeChannel;
      last_message: string;
      updated_at: string;
    }
  > = {};

  if (memberIds.length === 0) return result;

  const { data: commLogs } = await supabase
    .from("communication_logs")
    .select("id, member_id, actor_name, message_preview, metadata, created_at")
    .in("member_id", memberIds)
    .eq("template_slug", "bienvenida_credencial")
    .order("created_at", { ascending: false });

  if (!commLogs) return result;

  for (const row of commLogs) {
    const mId = row.member_id;
    const meta = (row.metadata || {}) as Record<string, any>;
    const rowStatus = (meta.welcome_status as WelcomeStatus) || "preparado";
    const isConfirmed = rowStatus === "enviado" || rowStatus === "entregado";

    if (!result[mId]) {
      result[mId] = {
        status: rowStatus,
        confirmed: isConfirmed,
        sent_at: meta.sent_at || null,
        actor_name: row.actor_name || meta.actor_name || "Administrador Compartido",
        channel: (meta.channel_used as WelcomeChannel) || "WHATSAPP_MANUAL",
        last_message: row.message_preview || meta.last_message || "",
        updated_at: row.created_at,
      };
    } else if (isConfirmed && !result[mId].confirmed) {
      // Si un registro previo estaba confirmado y el último solo fue una descarga/preparación,
      // conservar que la bienvenida ya fue enviada y confirmada.
      result[mId].confirmed = true;
      result[mId].status = rowStatus;
      result[mId].sent_at = meta.sent_at || row.created_at;
    }
  }

  return result;
}

