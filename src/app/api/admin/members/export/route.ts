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

    const { data: members, error } = await supabase
      .from("members")
      .select(`
        member_number,
        first_name,
        last_name,
        email,
        phone,
        city,
        birth_date,
        status,
        membership_level,
        marketing_consent,
        privacy_consent,
        source,
        utm_campaign,
        created_at,
        member_engagement_scores (total_score, category)
      `)
      .order("member_number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate CSV
    const headers = [
      "Member ID",
      "Nombre",
      "Apellido",
      "Email",
      "Teléfono",
      "Ciudad",
      "Fecha Nacimiento",
      "Estado",
      "Nivel",
      "Score Fidelización",
      "Categoría",
      "Consentimiento Marketing",
      "Campaña",
      "Fecha Registro",
    ];

    const rows = (members || []).map((m: any) => {
      const score = m.member_engagement_scores?.[0];
      return [
        `"${m.member_number || ""}"`,
        `"${(m.first_name || "").replace(/"/g, '""')}"`,
        `"${(m.last_name || "").replace(/"/g, '""')}"`,
        `"${m.email || ""}"`,
        `"${m.phone || ""}"`,
        `"${m.city || ""}"`,
        `"${m.birth_date || ""}"`,
        `"${m.status || ""}"`,
        `"${m.membership_level || ""}"`,
        score?.total_score || 5,
        `"${score?.category || "NUEVO_MIEMBRO"}"`,
        m.marketing_consent ? "SI" : "NO",
        `"${m.utm_campaign || m.source || ""}"`,
        `"${m.created_at || ""}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    await logAdminAudit(
      "EXPORT_MEMBERS_CSV",
      { totalExported: members?.length || 0 },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "members",
      }
    );

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="club_bacacha_miembros_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al exportar CSV";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
