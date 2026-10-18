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

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();

    // 1. Total members and list for aggregation
    const { data: members, error: mErr } = await supabase
      .from("members")
      .select("id, member_number, first_name, last_name, email, city, birth_date, created_at, status, membership_level, utm_campaign, source, referred_by")
      .order("created_at", { ascending: false });

    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 });
    }

    const allMembers = members || [];
    const totalMembers = allMembers.length;

    // Registrations over periods
    const todayRegistrations = allMembers.filter((m) => m.created_at >= startOfToday).length;
    const sevenDaysRegistrations = allMembers.filter((m) => m.created_at >= sevenDaysAgo).length;
    const thirtyDaysRegistrations = allMembers.filter((m) => m.created_at >= thirtyDaysAgo).length;
    const previousThirtyDaysRegistrations = allMembers.filter(
      (m) => m.created_at >= sixtyDaysAgo && m.created_at < thirtyDaysAgo
    ).length;

    const growthPercent =
      previousThirtyDaysRegistrations > 0
        ? Math.round(
            ((thirtyDaysRegistrations - previousThirtyDaysRegistrations) /
              previousThirtyDaysRegistrations) *
              100
          )
        : thirtyDaysRegistrations > 0
        ? 100
        : 0;

    // Members by City
    const cityCounts: Record<string, number> = {};
    allMembers.forEach((m) => {
      const c = m.city || "Sin ciudad";
      cityCounts[c] = (cityCounts[c] || 0) + 1;
    });

    // Members by Acquisition / Campaign
    const acquisitionCounts: Record<string, number> = {};
    allMembers.forEach((m) => {
      const src = m.utm_campaign || m.source || (m.referred_by ? "referido" : "directo");
      acquisitionCounts[src] = (acquisitionCounts[src] || 0) + 1;
    });

    // Upcoming birthdays in next 30 days
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const upcomingBirthdays = allMembers
      .filter((m) => {
        if (!m.birth_date) return false;
        const b = new Date(m.birth_date);
        const bMonth = b.getUTCMonth() + 1;
        const bDay = b.getUTCDate();
        // Check this month or next month
        if (bMonth === currentMonth && bDay >= currentDay) return true;
        if (bMonth === (currentMonth % 12) + 1 && bDay <= currentDay) return true;
        return false;
      })
      .slice(0, 10);

    // VIP members
    const vipMembersCount = allMembers.filter(
      (m) => m.status === "VIP" || m.membership_level === "VIP" || m.membership_level === "BLACK_MEMBER"
    ).length;

    // 2. Engagement scores & categories
    const { data: scores } = await supabase
      .from("member_engagement_scores")
      .select("*");

    const allScores = scores || [];
    const activeRecentlyCount = allScores.filter(
      (s) => s.last_activity_at && s.last_activity_at >= thirtyDaysAgo
    ).length;

    const toReactivateCount = allScores.filter(
      (s) => s.last_activity_at && s.last_activity_at < thirtyDaysAgo
    ).length;

    const categoryDistribution: Record<string, number> = {
      NUEVO_MIEMBRO: 0,
      MIEMBRO_PARTICIPATIVO: 0,
      MIEMBRO_DESTACADO: 0,
      EMBAJADOR_CLUB: 0,
      SIN_ACTIVIDAD: 0,
    };
    allScores.forEach((s) => {
      const cat = s.category || "NUEVO_MIEMBRO";
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });

    // 3. Events count
    const { count: eventsCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .in("status", ["published"]);

    // 4. Benefits count
    const { count: benefitsCount } = await supabase
      .from("benefits")
      .select("*", { count: "exact", head: true })
      .eq("active", true);

    // 5. Confirmed referrals
    const { count: referralsCount } = await supabase
      .from("member_referrals")
      .select("*", { count: "exact", head: true })
      .in("status", ["REGISTERED", "QUALIFIED", "REWARDED"]);

    // 6. Check-ins count
    const { count: checkinsCount } = await supabase
      .from("event_checkins")
      .select("*", { count: "exact", head: true });

    // 7. Benefits redeemed count
    const { count: redemptionsCount } = await supabase
      .from("member_benefits")
      .select("*", { count: "exact", head: true })
      .in("status", ["CLAIMED", "USED"]);

    // 8. Communication logs count
    const { count: commsCount } = await supabase
      .from("communication_logs")
      .select("*", { count: "exact", head: true });

    const totalInteractions =
      (checkinsCount || 0) + (redemptionsCount || 0) + (commsCount || 0);

    // Daily registrations trend (last 14 days)
    const dailyRegistrations: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      const count = allMembers.filter((m) => m.created_at.startsWith(dateStr)).length;
      dailyRegistrations.push({ date: dateStr, count });
    }

    return NextResponse.json({
      metrics: {
        totalMembers,
        todayRegistrations,
        sevenDaysRegistrations,
        thirtyDaysRegistrations,
        growthPercent,
        vipMembersCount,
        eventsCount: eventsCount || 0,
        benefitsCount: benefitsCount || 0,
        referralsCount: referralsCount || 0,
        activeRecentlyCount,
        toReactivateCount,
        totalInteractions,
      },
      cityCounts,
      acquisitionCounts,
      upcomingBirthdays,
      categoryDistribution,
      dailyRegistrations,
      recentMembers: allMembers.slice(0, 5),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
