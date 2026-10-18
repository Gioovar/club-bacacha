import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
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
    const search = searchParams.get("search")?.trim().toLowerCase();
    const city = searchParams.get("city");
    const status = searchParams.get("status");
    const level = searchParams.get("level");
    const campaign = searchParams.get("campaign");
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("members")
      .select(`
        *,
        member_engagement_scores (*),
        member_tags (tag)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (city && city !== "ALL") query = query.eq("city", city);
    if (status && status !== "ALL") query = query.eq("status", status);
    if (level && level !== "ALL") query = query.eq("membership_level", level);
    if (campaign && campaign !== "ALL") query = query.eq("utm_campaign", campaign);

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,member_number.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data: members, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format members with flattened tags and scores
    let formattedMembers = (members || []).map((m: any) => {
      const score = m.member_engagement_scores?.[0] || {
        total_score: 5,
        category: "NUEVO_MIEMBRO",
        last_activity_at: m.created_at,
        events_attended_count: 0,
        benefits_used_count: 0,
        referrals_confirmed_count: 0,
      };

      const tags = (m.member_tags || []).map((t: any) => t.tag);

      // Compute age from birthdate
      let age = null;
      if (m.birth_date) {
        const diff = Date.now() - new Date(m.birth_date).getTime();
        age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      }

      return {
        ...m,
        age,
        engagement_score: score.total_score,
        engagement_category: score.category,
        last_activity_at: score.last_activity_at,
        events_attended_count: score.events_attended_count,
        benefits_used_count: score.benefits_used_count,
        referrals_confirmed_count: score.referrals_confirmed_count,
        tags,
      };
    });

    if (category && category !== "ALL") {
      formattedMembers = formattedMembers.filter((m: any) => m.engagement_category === category);
    }

    return NextResponse.json({
      members: formattedMembers,
      pagination: {
        page,
        limit,
        total: count || formattedMembers.length,
        totalPages: Math.ceil((count || formattedMembers.length) / limit),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener miembros";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
    const { id, status, membership_level, city } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de miembro requerido" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (membership_level) updates.membership_level = membership_level;
    if (city) updates.city = city;

    const { data, error } = await supabase
      .from("members")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAudit(
      "UPDATE_MEMBER",
      { updates },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "member",
        targetId: id,
      }
    );

    return NextResponse.json({ member: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al actualizar miembro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
