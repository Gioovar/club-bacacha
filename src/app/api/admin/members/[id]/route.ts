import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    // 1. Member core info
    const { data: member, error: mErr } = await supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single();

    if (mErr || !member) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    // Compute age
    let age = null;
    if (member.birth_date) {
      const diff = Date.now() - new Date(member.birth_date).getTime();
      age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }

    // 2. Engagement score
    const { data: score } = await supabase
      .from("member_engagement_scores")
      .select("*")
      .eq("member_id", id)
      .single();

    // 3. Tags
    const { data: tags } = await supabase
      .from("member_tags")
      .select("tag, created_at")
      .eq("member_id", id);

    // 4. Notes
    const { data: notes } = await supabase
      .from("member_notes")
      .select("*")
      .eq("member_id", id)
      .order("created_at", { ascending: false });

    // 5. Activity log
    const { data: activity } = await supabase
      .from("member_activity")
      .select("*")
      .eq("member_id", id)
      .order("created_at", { ascending: false });

    // 6. Event checkins (attended events)
    const { data: checkins } = await supabase
      .from("event_checkins")
      .select(`
        id,
        checkin_at,
        verified_by_name,
        events:event_id (
          id,
          name,
          event_date,
          venue,
          city
        )
      `)
      .eq("member_id", id)
      .order("checkin_at", { ascending: false });

    // 7. Benefits redemptions
    const { data: benefits } = await supabase
      .from("member_benefits")
      .select(`
        id,
        status,
        redeemed_at,
        used_at,
        notes,
        benefits:benefit_id (
          id,
          title,
          phrase,
          active
        )
      `)
      .eq("member_id", id)
      .order("created_at", { ascending: false });

    // 8. Referrals made by this member
    const { data: referrals } = await supabase
      .from("member_referrals")
      .select(`
        id,
        status,
        created_at,
        referred:referred_member_id (
          id,
          member_number,
          first_name,
          last_name,
          city,
          created_at
        )
      `)
      .eq("referrer_member_id", id)
      .order("created_at", { ascending: false });

    // 9. Communication logs
    const { data: communications } = await supabase
      .from("communication_logs")
      .select("*")
      .eq("member_id", id)
      .order("created_at", { ascending: false });

    // 10. Consents
    const { data: consents } = await supabase
      .from("member_consents")
      .select("*")
      .eq("member_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      member: { ...member, age },
      score: score || {
        total_score: 5,
        score_30d: 5,
        category: "NUEVO_MIEMBRO",
        events_attended_count: 0,
        benefits_used_count: 0,
        referrals_confirmed_count: 0,
      },
      tags: (tags || []).map((t) => t.tag),
      notes: notes || [],
      activity: activity || [],
      events: checkins || [],
      benefits: benefits || [],
      referrals: referrals || [],
      communications: communications || [],
      consents: consents || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener ficha de miembro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
