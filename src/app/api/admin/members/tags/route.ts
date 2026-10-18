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
    const { memberIds, tag } = body;

    if (!Array.isArray(memberIds) || memberIds.length === 0 || !tag) {
      return NextResponse.json({ error: "Se requieren memberIds (array) y tag (string)" }, { status: 400 });
    }

    const cleanTag = tag.trim().toLowerCase();
    const rows = memberIds.map((id) => ({
      member_id: id,
      tag: cleanTag,
    }));

    const { error } = await supabase
      .from("member_tags")
      .upsert(rows, { onConflict: "member_id, tag" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAudit(
      "BATCH_TAG_MEMBERS",
      { memberIds, tag: cleanTag },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "member_tags",
      }
    );

    return NextResponse.json({ success: true, count: memberIds.length, tag: cleanTag });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al asignar etiquetas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
