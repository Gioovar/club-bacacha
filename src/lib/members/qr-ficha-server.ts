import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAudit } from "@/lib/admin/session";
import { formatMemberBadge, formatMemberFullName } from "./welcome";
import {
  OFFICIAL_PROMO_VENUE,
  ensureOfficialPromoClauses,
} from "@/lib/benefits/clauses";

export interface QrBenefitItem {
  id: string;
  title: string;
  phrase: string;
  description: string | null;
  benefit_type: string;
  venue: string;
  terms: string;
  points_cost: number;
  points_award: number;
  starts_at: string | null;
  ends_at: string | null;
  stock: number | null;
  max_redemptions_per_member: number;
  times_used_by_member: number;
  associated_event_name?: string | null;
  can_afford_points: boolean;
}

export interface QrUsedBenefitItem {
  id: string;
  benefit_id: string;
  title: string;
  phrase: string | null;
  status: string;
  used_at: string;
  redemption_code: string | null;
  verified_by_name: string | null;
  points_spent: number;
}

export interface QrVisitRecord {
  id: string;
  visited_at: string;
  source: "VISIT" | "EVENT_CHECKIN";
  label: string;
}

export interface MemberQrFicha {
  member: {
    id: string;
    member_number: string;
    formatted_number: string;
    first_name: string;
    last_name: string;
    full_name: string;
    city: string;
    status: string;
    is_active: boolean;
    status_label: "ACTIVO" | "INACTIVO";
    membership_level: string;
    since_year: number;
    created_at: string;
    is_birthday_month: boolean;
  };
  stats: {
    total_visits: number;
    loyalty_level: string;
    loyalty_category_raw: string;
    engagement_score: number;
    points_balance: number | null;
    handles_points: boolean;
    last_visit_at: string | null;
  };
  available_benefits: QrBenefitItem[];
  used_benefits: QrUsedBenefitItem[];
  recent_visits: QrVisitRecord[];
}

const LOYALTY_CATEGORY_LABELS: Record<string, string> = {
  NUEVO_MIEMBRO: "Nuevo Miembro",
  MIEMBRO_PARTICIPATIVO: "Miembro Participativo",
  MIEMBRO_DESTACADO: "Miembro Destacado",
  EMBAJADOR_CLUB: "Embajador del Club",
  SIN_ACTIVIDAD: "Sin Actividad Reciente",
};

function formatLoyaltyCategory(rawCategory: string | null | undefined): string {
  if (!rawCategory) return "Nuevo Miembro";
  return (
    LOYALTY_CATEGORY_LABELS[rawCategory] ||
    rawCategory.replace(/_/g, " ")
  );
}

/**
 * Consulta en tiempo real desde Supabase toda la ficha digital del socio al escanear su QR:
 * datos de identidad, estado ACTIVO/INACTIVO, visitas registradas, nivel de fidelización,
 * puntos reales y beneficios disponibles y utilizados.
 */
export async function getMemberQrFichaByToken(
  token: string,
  options?: { recordScan?: boolean }
): Promise<MemberQrFicha | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const cleanToken = (token || "").trim();
  if (!cleanToken) return null;

  // 1. Localizar miembro real por qr_token
  const { data: member, error: mErr } = await supabase
    .from("members")
    .select(
      "id, member_number, first_name, last_name, city, birth_date, status, membership_level, qr_token, created_at"
    )
    .eq("qr_token", cleanToken)
    .maybeSingle();

  if (mErr || !member) return null;

  // Registrar escaneo en bitácora si se solicita
  if (options?.recordScan) {
    try {
      await supabase.from("member_activity").insert({
        member_id: member.id,
        activity_type: "QR_SCAN",
        metadata: {
          scanned_at: new Date().toISOString(),
          status_at_scan: member.status,
        },
      });
    } catch {
      // No interrumpir lectura
    }
  }

  const now = new Date();
  const isActive = member.status === "ACTIVE" || member.status === "VIP";
  const statusLabel: "ACTIVO" | "INACTIVO" = isActive ? "ACTIVO" : "INACTIVO";

  let isBirthdayMonth = false;
  if (member.birth_date) {
    const bDate = new Date(member.birth_date);
    if (!Number.isNaN(bDate.getTime())) {
      isBirthdayMonth = bDate.getUTCMonth() === now.getUTCMonth();
    }
  }

  // 2. Consultar consultas en paralelo en Supabase
  const [
    scoreRes,
    checkinsRes,
    visitActivitiesRes,
    loyaltyTxRes,
    activeBenefitsRes,
    memberBenefitsRes,
    loyaltyRedemptionsRes,
    eventsRes,
  ] = await Promise.all([
    supabase
      .from("member_engagement_scores")
      .select("*")
      .eq("member_id", member.id)
      .maybeSingle(),
    supabase
      .from("event_checkins")
      .select("id, checkin_at, events:event_id ( id, name )")
      .eq("member_id", member.id)
      .order("checkin_at", { ascending: false }),
    supabase
      .from("member_activity")
      .select("id, activity_type, metadata, created_at")
      .eq("member_id", member.id)
      .in("activity_type", ["VISIT_REGISTERED", "EVENT_ATTENDANCE"])
      .order("created_at", { ascending: false }),
    supabase
      .from("loyalty_transactions")
      .select("balance_after, created_at")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("benefits")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("member_benefits")
      .select(`
        id,
        benefit_id,
        status,
        redeemed_at,
        used_at,
        redemption_code,
        verified_by_name,
        points_spent,
        notes,
        benefits:benefit_id (
          id,
          title,
          phrase
        )
      `)
      .eq("member_id", member.id)
      .order("redeemed_at", { ascending: false }),
    supabase
      .from("loyalty_redemptions")
      .select("*")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("id, name, status"),
  ]);

  const scoreRow = scoreRes.data;
  const checkins = checkinsRes.data || [];
  const visitActivities = (visitActivitiesRes.data || []).filter(
    (a: any) => a.activity_type === "VISIT_REGISTERED"
  );

  // Calcular total de visitas reales sin duplicar
  const scoreVisits = Number(scoreRow?.events_attended_count || 0);
  const explicitVisitsCount = checkins.length + visitActivities.length;
  const totalVisits = Math.max(scoreVisits, explicitVisitsCount);

  // Construir historial reciente de visitas
  const recentVisits: QrVisitRecord[] = [
    ...visitActivities.map((v: any) => ({
      id: v.id,
      visited_at: v.created_at,
      source: "VISIT" as const,
      label: v.metadata?.note || "Visita presencial en Club Bacachá",
    })),
    ...checkins.map((c: any) => ({
      id: c.id,
      visited_at: c.checkin_at,
      source: "EVENT_CHECKIN" as const,
      label: c.events?.name ? `Evento: ${c.events.name}` : "Check-in en Evento",
    })),
  ]
    .sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime())
    .slice(0, 10);

  const lastVisitAt = recentVisits[0]?.visited_at || null;

  // 3. Puntos acumulados reales (sin inventar puntos)
  const engagementScore = Number(scoreRow?.total_score ?? 5);
  let pointsBalance: number | null = null;
  let handlesPoints = false;

  if (loyaltyTxRes.data && loyaltyTxRes.data.length > 0) {
    pointsBalance = Number(loyaltyTxRes.data[0].balance_after ?? 0);
    handlesPoints = true;
  } else if (scoreRow && typeof scoreRow.total_score === "number") {
    pointsBalance = Number(scoreRow.total_score);
    handlesPoints = true;
  }

  // 4. Mapa de eventos para promociones asociadas a evento
  const eventsMap = new Map<string, { id: string; name: string; status: string }>();
  (eventsRes.data || []).forEach((ev: any) => {
    eventsMap.set(ev.id, ev);
  });

  // 5. Procesar beneficios que el socio YA utilizó (desde member_benefits y loyalty_redemptions)
  const rawMemberBenefits = memberBenefitsRes.data || [];
  const usedCountsByBenefitId = new Map<string, number>();

  const usedBenefits: QrUsedBenefitItem[] = [];

  for (const mb of rawMemberBenefits) {
    if (mb.status === "USED" || mb.status === "CLAIMED") {
      usedCountsByBenefitId.set(
        mb.benefit_id,
        (usedCountsByBenefitId.get(mb.benefit_id) || 0) + 1
      );

      const benObj = Array.isArray(mb.benefits) ? mb.benefits[0] : mb.benefits;
      usedBenefits.push({
        id: mb.id,
        benefit_id: mb.benefit_id,
        title: benObj?.title || "Beneficio Club Bacachá",
        phrase: benObj?.phrase || null,
        status: mb.status,
        used_at: mb.used_at || mb.redeemed_at,
        redemption_code: mb.redemption_code || null,
        verified_by_name: mb.verified_by_name || null,
        points_spent: Number(mb.points_spent || 0),
      });
    }
  }

  for (const lr of loyaltyRedemptionsRes.data || []) {
    if (lr.status !== "CANCELLED") {
      usedBenefits.push({
        id: lr.id,
        benefit_id: lr.reward_id || lr.id,
        title: lr.reward_title || "Recompensa de Lealtad",
        phrase: lr.notes || null,
        status: lr.status,
        used_at: lr.fulfilled_at || lr.created_at,
        redemption_code: lr.redemption_code || null,
        verified_by_name: lr.fulfilled_by || null,
        points_spent: Number(lr.points_spent || 0),
      });
    }
  }

  // 6. Filtrar beneficios disponibles en Supabase respetando las condiciones de cada promoción
  const availableBenefits: QrBenefitItem[] = [];

  if (isActive) {
    for (const b of activeBenefitsRes.data || []) {
      let parsedReqs: Record<string, any> = {};
      if (b.requirements && typeof b.requirements === "string") {
        try {
          if (b.requirements.startsWith("{")) {
            parsedReqs = JSON.parse(b.requirements);
          } else {
            parsedReqs = { terms: b.requirements };
          }
        } catch {
          parsedReqs = { terms: b.requirements };
        }
      }

      const bStatus = b.status || parsedReqs.status || (b.active ? "published" : "draft");
      if (bStatus !== "published") continue;

      // Validar fechas de inicio y fin
      if (b.starts_at && new Date(b.starts_at) > now) continue;
      if (b.ends_at && new Date(b.ends_at) < now) continue;

      // Validar stock si aplica
      const stock =
        b.stock !== undefined && b.stock !== null
          ? Number(b.stock)
          : parsedReqs.stock !== undefined && parsedReqs.stock !== null
          ? Number(parsedReqs.stock)
          : null;
      if (stock !== null && stock <= 0) continue;

      // Validar límite de usos por socio
      const maxPerMember =
        b.max_redemptions_per_member !== undefined && b.max_redemptions_per_member !== null
          ? Number(b.max_redemptions_per_member)
          : parsedReqs.max_per_member !== undefined && parsedReqs.max_per_member !== null
          ? Number(parsedReqs.max_per_member)
          : 1;

      const timesUsed = usedCountsByBenefitId.get(b.id) || 0;
      if (maxPerMember > 0 && timesUsed >= maxPerMember) continue;

      const benefitType =
        b.benefit_type ||
        parsedReqs.benefit_type ||
        "MEMBER_PROMO";

      // Si es beneficio exclusivo de cumpleaños, validar que sea el mes de cumpleaños del socio
      if (benefitType === "BIRTHDAY_BENEFIT" && !isBirthdayMonth) {
        continue;
      }

      // Si está vinculado a un evento específico, validar que el evento no esté cancelado o archivado
      const eventId = b.event_id || parsedReqs.event_id || null;
      const assocEvent = eventId ? eventsMap.get(eventId) : null;
      if (assocEvent && (assocEvent.status === "cancelled" || assocEvent.status === "archived")) {
        continue;
      }

      const pointsCost =
        b.points_cost !== undefined && b.points_cost !== null
          ? Number(b.points_cost)
          : Number(parsedReqs.points_cost || 0);

      const pointsAward =
        b.points_award !== undefined && b.points_award !== null
          ? Number(b.points_award)
          : Number(parsedReqs.points_award || 0);

      const venue =
        b.venue ||
        parsedReqs.venue ||
        OFFICIAL_PROMO_VENUE;

      const rawTerms =
        b.terms ||
        parsedReqs.terms ||
        parsedReqs.text ||
        "";
      const terms = ensureOfficialPromoClauses(rawTerms);

      const canAffordPoints =
        pointsCost <= 0 || (pointsBalance !== null && pointsBalance >= pointsCost);

      availableBenefits.push({
        id: b.id,
        title: b.title,
        phrase: b.phrase,
        description: b.description || null,
        benefit_type: benefitType,
        venue,
        terms,
        points_cost: pointsCost,
        points_award: pointsAward,
        starts_at: b.starts_at || null,
        ends_at: b.ends_at || null,
        stock,
        max_redemptions_per_member: maxPerMember,
        times_used_by_member: timesUsed,
        associated_event_name: assocEvent?.name || null,
        can_afford_points: canAffordPoints,
      });
    }
  }

  const loyaltyCategoryRaw = scoreRow?.category || "NUEVO_MIEMBRO";

  return {
    member: {
      id: member.id,
      member_number: member.member_number,
      formatted_number: formatMemberBadge(member.member_number),
      first_name: member.first_name,
      last_name: member.last_name,
      full_name: formatMemberFullName(member),
      city: member.city,
      status: member.status,
      is_active: isActive,
      status_label: statusLabel,
      membership_level: member.membership_level,
      since_year: new Date(member.created_at).getFullYear(),
      created_at: member.created_at,
      is_birthday_month: isBirthdayMonth,
    },
    stats: {
      total_visits: totalVisits,
      loyalty_level: formatLoyaltyCategory(loyaltyCategoryRaw),
      loyalty_category_raw: loyaltyCategoryRaw,
      engagement_score: engagementScore,
      points_balance: pointsBalance,
      handles_points: handlesPoints,
      last_visit_at: lastVisitAt,
    },
    available_benefits: availableBenefits,
    used_benefits: usedBenefits,
    recent_visits: recentVisits,
  };
}

/**
 * Registra una visita presencial del socio al escanear su QR y actualiza inmediatamente
 * su historial y todos los contadores de fidelización del CRM en Supabase.
 */
export async function registerMemberQrVisitByToken(
  token: string,
  meta?: { operatorName?: string; note?: string; ip?: string }
): Promise<
  | { ok: true; ficha: MemberQrFicha; pointsAwarded: number; duplicateGuard?: boolean }
  | { ok: false; error: string; status: number }
> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false, error: "Base de datos no disponible", status: 503 };
  }

  const cleanToken = (token || "").trim();
  if (!cleanToken) {
    return { ok: false, error: "Token QR requerido", status: 400 };
  }

  const { data: member, error: mErr } = await supabase
    .from("members")
    .select("id, member_number, first_name, last_name, status")
    .eq("qr_token", cleanToken)
    .maybeSingle();

  if (mErr || !member) {
    return { ok: false, error: "Socio no encontrado para este código QR", status: 404 };
  }

  if (member.status !== "ACTIVE" && member.status !== "VIP") {
    return {
      ok: false,
      error: `La membresía #${member.member_number} se encuentra INACTIVA (${member.status}). No se puede registrar visita.`,
      status: 403,
    };
  }

  // Protección contra doble clic accidental en los últimos 60 segundos
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: recentVisit } = await supabase
    .from("member_activity")
    .select("id, created_at")
    .eq("member_id", member.id)
    .eq("activity_type", "VISIT_REGISTERED")
    .gte("created_at", sixtySecondsAgo)
    .limit(1)
    .maybeSingle();

  if (recentVisit) {
    const ficha = await getMemberQrFichaByToken(cleanToken, { recordScan: false });
    if (ficha) {
      return {
        ok: true,
        ficha,
        pointsAwarded: 0,
        duplicateGuard: true,
      };
    }
  }

  // Obtener reglas de puntuación reales desde admin_config
  let attendancePoints = 20;
  let participativoMin = 20;
  let destacadoMin = 50;

  try {
    const { data: configs } = await supabase
      .from("admin_config")
      .select("key, value")
      .in("key", ["scoring_rules", "loyalty_thresholds"]);

    for (const c of configs || []) {
      if (c.key === "scoring_rules" && c.value && typeof c.value === "object") {
        const val = c.value as Record<string, any>;
        if (typeof val.event_attendance === "number") {
          attendancePoints = val.event_attendance;
        }
      }
      if (c.key === "loyalty_thresholds" && c.value && typeof c.value === "object") {
        const val = c.value as Record<string, any>;
        if (typeof val.participativo_min === "number") participativoMin = val.participativo_min;
        if (typeof val.destacado_min === "number") destacadoMin = val.destacado_min;
      }
    }
  } catch {
    // Usar valores predeterminados del CRM
  }

  const nowIso = new Date().toISOString();
  const operatorLabel = meta?.operatorName || "Recepción / Staff QR";

  // 1. Registrar visita en member_activity
  await supabase.from("member_activity").insert({
    member_id: member.id,
    activity_type: "VISIT_REGISTERED",
    metadata: {
      visited_at: nowIso,
      verified_by: operatorLabel,
      note: meta?.note || "Visita presencial registrada por escaneo QR",
      points_awarded: attendancePoints,
    },
  });

  // 2. Actualizar contadores del CRM en member_engagement_scores
  const { data: currentScore } = await supabase
    .from("member_engagement_scores")
    .select("*")
    .eq("member_id", member.id)
    .maybeSingle();

  const currentTotalScore = Number(currentScore?.total_score ?? 5);
  const currentAttended = Number(currentScore?.events_attended_count ?? 0);
  const newTotalScore = currentTotalScore + attendancePoints;
  const newAttendedCount = currentAttended + 1;

  let newCategory = currentScore?.category || "NUEVO_MIEMBRO";
  if (newCategory !== "EMBAJADOR_CLUB") {
    if (newTotalScore >= destacadoMin) {
      newCategory = "MIEMBRO_DESTACADO";
    } else if (newTotalScore >= participativoMin) {
      newCategory = "MIEMBRO_PARTICIPATIVO";
    } else {
      newCategory = "NUEVO_MIEMBRO";
    }
  }

  await supabase.from("member_engagement_scores").upsert(
    {
      member_id: member.id,
      total_score: newTotalScore,
      score_30d: Number(currentScore?.score_30d ?? 5) + attendancePoints,
      score_60d: Number(currentScore?.score_60d ?? 5) + attendancePoints,
      score_90d: Number(currentScore?.score_90d ?? 5) + attendancePoints,
      events_attended_count: newAttendedCount,
      category: newCategory,
      last_activity_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: "member_id" }
  );

  // 3. Si el socio ya tiene transacciones en loyalty_transactions, abonar puntos de visita
  try {
    const { data: lastTx } = await supabase
      .from("loyalty_transactions")
      .select("balance_after")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastTx && typeof lastTx.balance_after === "number") {
      await supabase.from("loyalty_transactions").insert({
        member_id: member.id,
        amount: attendancePoints,
        balance_after: lastTx.balance_after + attendancePoints,
        type: "EVENT_ATTENDANCE",
        description: "Visita presencial registrada en Club Bacachá",
        metadata: { verified_by: operatorLabel, visited_at: nowIso },
        created_by: operatorLabel,
      });
    }
  } catch {
    // Continuar si loyalty_transactions no aplica
  }

  // 4. Registrar en auditoría del CRM
  await logAdminAudit(
    "QR_VISIT_REGISTERED",
    {
      memberId: member.id,
      memberNumber: member.member_number,
      newVisitsCount: newAttendedCount,
      newTotalScore,
      pointsAwarded: attendancePoints,
    },
    {
      actorName: operatorLabel,
      targetType: "member",
      targetId: member.id,
      ip: meta?.ip,
    }
  );

  const updatedFicha = await getMemberQrFichaByToken(cleanToken, {
    recordScan: false,
  });

  if (!updatedFicha) {
    return { ok: false, error: "Error al recargar la ficha del socio", status: 500 };
  }

  return {
    ok: true,
    ficha: updatedFicha,
    pointsAwarded: attendancePoints,
  };
}

