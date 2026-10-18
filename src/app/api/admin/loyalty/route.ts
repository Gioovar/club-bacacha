import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "all"; // '30d', '60d', '90d', 'all'

    // Fetch members with engagement scores
    const { data: members, error } = await supabase
      .from("members")
      .select(`
        id,
        member_number,
        first_name,
        last_name,
        email,
        phone,
        city,
        birth_date,
        membership_level,
        status,
        created_at,
        member_engagement_scores (*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();

    const formattedList = (members || []).map((m: any) => {
      const s = m.member_engagement_scores?.[0] || {
        total_score: 5,
        score_30d: 5,
        score_60d: 5,
        score_90d: 5,
        category: "NUEVO_MIEMBRO",
        events_attended_count: 0,
        benefits_used_count: 0,
        referrals_confirmed_count: 0,
        last_activity_at: m.created_at,
      };

      let activeScore = s.total_score;
      if (timeframe === "30d") activeScore = s.score_30d;
      else if (timeframe === "60d") activeScore = s.score_60d;
      else if (timeframe === "90d") activeScore = s.score_90d;

      return {
        id: m.id,
        member_number: m.member_number,
        name: `${m.first_name} ${m.last_name}`,
        first_name: m.first_name,
        phone: m.phone,
        email: m.email,
        city: m.city,
        birth_date: m.birth_date,
        membership_level: m.membership_level,
        status: m.status,
        score: activeScore,
        category: s.category,
        events_attended: s.events_attended_count,
        benefits_used: s.benefits_used_count,
        referrals_confirmed: s.referrals_confirmed_count,
        last_activity: s.last_activity_at,
      };
    });

    // Top Most Active
    const topActive = [...formattedList].sort((a, b) => b.score - a.score).slice(0, 10);

    // Top Referrers
    const topReferrers = [...formattedList]
      .filter((m) => m.referrals_confirmed > 0)
      .sort((a, b) => b.referrals_confirmed - a.referrals_confirmed)
      .slice(0, 10);

    // Top Event Attendees
    const topAttendees = [...formattedList]
      .filter((m) => m.events_attended > 0)
      .sort((a, b) => b.events_attended - a.events_attended)
      .slice(0, 10);

    // Top Benefit Users
    const topBenefitUsers = [...formattedList]
      .filter((m) => m.benefits_used > 0)
      .sort((a, b) => b.benefits_used - a.benefits_used)
      .slice(0, 10);

    // Members to Reactivate (inactive > 30 days)
    const toReactivate = formattedList
      .filter((m) => m.last_activity && m.last_activity < thirtyDaysAgo)
      .slice(0, 10);

    // Generate Operational Suggestions
    const suggestions: any[] = [];

    // 1. High Engagement suggestion
    const topTierCandidate = formattedList.find(
      (m) => m.score >= 20 && m.membership_level === "MEMBER"
    );
    if (topTierCandidate) {
      suggestions.push({
        id: "sug_upgrade_" + topTierCandidate.id,
        type: "UPGRADE_VIP",
        title: "Ascenso a VIP sugerido",
        reason: `${topTierCandidate.name} tiene ${topTierCandidate.score} puntos de engagement y sigue con nivel regular.`,
        memberId: topTierCandidate.id,
        memberName: topTierCandidate.name,
        actionLabel: "Revisar Membresía",
        actionHref: `/admin/miembros/${topTierCandidate.id}`,
      });
    }

    // 2. Birthday suggestion
    const currentMonth = now.getMonth() + 1;
    const birthdayMember = formattedList.find((m) => {
      if (!m.birth_date) return false;
      const bMonth = new Date(m.birth_date).getUTCMonth() + 1;
      return bMonth === currentMonth;
    });
    if (birthdayMember) {
      suggestions.push({
        id: "sug_bday_" + birthdayMember.id,
        type: "BIRTHDAY",
        title: "Cumpleañero de este mes",
        reason: `${birthdayMember.name} cumple años en ${now.toLocaleString("es-MX", { month: "long" })}. Envíale una felicitación oficial.`,
        memberId: birthdayMember.id,
        memberName: birthdayMember.name,
        actionLabel: "Felicitar por WhatsApp",
        actionHref: `/admin/miembros/${birthdayMember.id}`,
      });
    }

    // 3. Ambassador suggestion
    const ambassador = formattedList.find((m) => m.referrals_confirmed >= 2);
    if (ambassador) {
      suggestions.push({
        id: "sug_ambassador_" + ambassador.id,
        type: "AMBASSADOR",
        title: "Embajador Activo del Club",
        reason: `${ambassador.name} ha recomendado a ${ambassador.referrals_confirmed} socios verificados. Sugerir cortesía de embajador.`,
        memberId: ambassador.id,
        memberName: ambassador.name,
        actionLabel: "Ver Referidos",
        actionHref: `/admin/miembros/${ambassador.id}`,
      });
    }

    // 4. Reactivation suggestion
    if (toReactivate.length > 0) {
      const inactive = toReactivate[0];
      suggestions.push({
        id: "sug_react_" + inactive.id,
        type: "REACTIVATION",
        title: "Oportunidad de Reactivación",
        reason: `${inactive.name} no ha registrado actividad en más de 30 días.`,
        memberId: inactive.id,
        memberName: inactive.name,
        actionLabel: "Enviar Invitación",
        actionHref: `/admin/miembros/${inactive.id}`,
      });
    }

    return NextResponse.json({
      topActive,
      topReferrers,
      topAttendees,
      topBenefitUsers,
      toReactivate,
      suggestions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener ranking de fidelización";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
