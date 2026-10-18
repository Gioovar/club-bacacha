import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { note } = body;

    if (!note || typeof note !== "string" || !note.trim()) {
      return NextResponse.json({ error: "Contenido de la nota requerido" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    const { data: newNote, error } = await supabase
      .from("member_notes")
      .insert({
        member_id: id,
        admin_user_id: session.user.id,
        author_name: session.user.name || "Administrador Compartido",
        note: note.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAudit(
      "ADD_MEMBER_NOTE",
      { noteLength: note.length },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "member",
        targetId: id,
      }
    );

    return NextResponse.json({ note: newNote });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al agregar nota";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
