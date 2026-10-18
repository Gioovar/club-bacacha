import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const { benefitId, memberId, qrToken, memberNumber, notes } = body;

    if (!benefitId) {
      return NextResponse.json({ error: "Beneficio requerido" }, { status: 400 });
    }

    // 1. Locate member
    let memberQuery = supabase.from("members").select("id, member_number, first_name, last_name, status");
    if (qrToken) {
      memberQuery = memberQuery.eq("qr_token", qrToken.trim());
    } else if (memberNumber) {
      memberQuery = memberQuery.eq("member_number", memberNumber.trim().replace(/^#/, ""));
    } else if (memberId) {
      memberQuery = memberQuery.eq("id", memberId);
    } else {
      return NextResponse.json({ error: "Identificador de socio requerido" }, { status: 400 });
    }

    const { data: member, error: mErr } = await memberQuery.single();
    if (mErr || !member) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 });
    }

    if (member.status === "BLOCKED") {
      return NextResponse.json({ error: "El socio tiene estatus BLOQUEADO" }, { status: 403 });
    }

    // 2. Validate benefit
    const { data: benefit, error: bErr } = await supabase
      .from("benefits")
      .select("id, title, active")
      .eq("id", benefitId)
      .single();

    if (bErr || !benefit) {
      return NextResponse.json({ error: "Beneficio no encontrado" }, { status: 404 });
    }

    if (!benefit.active) {
      return NextResponse.json({ error: "Este beneficio se encuentra pausado o inactivo" }, { status: 400 });
    }

    // 3. Register redemption in member_benefits
    const { data: redemption, error: rErr } = await supabase
      .from("member_benefits")
      .insert({
        member_id: member.id,
        benefit_id: benefit.id,
        status: "USED",
        redeemed_at: new Date().toISOString(),
        used_at: new Date().toISOString(),
        verified_by: session.user.id,
        notes: notes || "Canje autorizado en Centro de Administración",
      })
      .select()
      .single();

    if (rErr) {
      return NextResponse.json({ error: rErr.message }, { status: 500 });
    }

    // 4. Update engagement score (+15 points for redeemed benefit)
    const { data: currentScore } = await supabase
      .from("member_engagement_scores")
      .select("*")
      .eq("member_id", member.id)
      .single();

    const newScore = (currentScore?.total_score || 5) + 15;
    const newUsed = (currentScore?.benefits_used_count || 0) + 1;
    const newCategory = newScore >= 50 ? "MIEMBRO_DESTACADO" : newScore >= 20 ? "MIEMBRO_PARTICIPATIVO" : "NUEVO_MIEMBRO";

    await supabase.from("member_engagement_scores").upsert({
      member_id: member.id,
      total_score: newScore,
      score_30d: (currentScore?.score_30d || 5) + 15,
      score_60d: (currentScore?.score_60d || 5) + 15,
      score_90d: (currentScore?.score_90d || 5) + 15,
      benefits_used_count: newUsed,
      category: newCategory,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "member_id" });

    // 5. Activity log
    await supabase.from("member_activity").insert({
      member_id: member.id,
      activity_type: "BENEFIT_REDEEMED",
      metadata: { benefitId, benefitTitle: benefit.title, pointsAwarded: 15 },
    });

    // 6. Audit log
    await logAdminAudit(
      "REDEEM_BENEFIT",
      { benefitId, memberId: member.id, pointsAwarded: 15 },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "member_benefit",
        targetId: redemption.id,
      }
    );

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        member_number: member.member_number,
        first_name: member.first_name,
        last_name: member.last_name,
      },
      benefit: {
        id: benefit.id,
        title: benefit.title,
      },
      redemption,
      scoreAwarded: 15,
      newTotalScore: newScore,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error durante el canje";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
