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
    const { eventId, qrToken, memberNumber, memberId } = body;

    if (!eventId) {
      return NextResponse.json({ error: "Evento requerido" }, { status: 400 });
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
      return NextResponse.json({ error: "Identificador de miembro requerido (QR o #Socio)" }, { status: 400 });
    }

    const { data: member, error: mErr } = await memberQuery.single();
    if (mErr || !member) {
      return NextResponse.json({ error: "Socio no encontrado con los datos proporcionados" }, { status: 404 });
    }

    if (member.status === "BLOCKED") {
      return NextResponse.json({ error: "El socio tiene estatus BLOQUEADO" }, { status: 403 });
    }

    // 2. Check if already checked in
    const { data: existingCheckin } = await supabase
      .from("event_checkins")
      .select("id, checkin_at")
      .eq("event_id", eventId)
      .eq("member_id", member.id)
      .single();

    if (existingCheckin) {
      return NextResponse.json({
        error: "Check-in duplicado. Este socio ya fue registrado previamente para este evento.",
        checkedInAt: existingCheckin.checkin_at,
        member,
      }, { status: 409 });
    }

    // 3. Register Checkin
    const { data: checkin, error: cErr } = await supabase
      .from("event_checkins")
      .insert({
        event_id: eventId,
        member_id: member.id,
        verified_by: session.user.id,
        verified_by_name: session.user.name || "Operador Autorizado",
      })
      .select()
      .single();

    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }

    // 4. Update member engagement score (+20 points for verified attendance)
    const { data: currentScore } = await supabase
      .from("member_engagement_scores")
      .select("*")
      .eq("member_id", member.id)
      .single();

    const newScore = (currentScore?.total_score || 5) + 20;
    const newAttended = (currentScore?.events_attended_count || 0) + 1;
    const newCategory = newScore >= 50 ? "MIEMBRO_DESTACADO" : newScore >= 20 ? "MIEMBRO_PARTICIPATIVO" : "NUEVO_MIEMBRO";

    await supabase.from("member_engagement_scores").upsert({
      member_id: member.id,
      total_score: newScore,
      score_30d: (currentScore?.score_30d || 5) + 20,
      score_60d: (currentScore?.score_60d || 5) + 20,
      score_90d: (currentScore?.score_90d || 5) + 20,
      events_attended_count: newAttended,
      category: newCategory,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "member_id" });

    // 5. Activity log
    await supabase.from("member_activity").insert({
      member_id: member.id,
      activity_type: "EVENT_ATTENDANCE",
      metadata: { eventId, pointsAwarded: 20 },
    });

    // 6. Audit log
    await logAdminAudit(
      "CHECKIN_EVENT",
      { eventId, memberId: member.id, pointsAwarded: 20 },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "event_checkin",
        targetId: checkin.id,
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
      checkin,
      scoreAwarded: 20,
      newTotalScore: newScore,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error durante el check-in";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
