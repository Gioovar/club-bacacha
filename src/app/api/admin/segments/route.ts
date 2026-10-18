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

    const { data: segments, error } = await supabase
      .from("saved_segments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ segments: segments || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener segmentos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
    const { name, description, filters } = body;

    if (!name || !filters) {
      return NextResponse.json({ error: "Nombre y filtros requeridos" }, { status: 400 });
    }

    const { data: segment, error } = await supabase
      .from("saved_segments")
      .insert({
        name,
        description: description || null,
        filters,
        created_by: session.user.name,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAudit(
      "CREATE_SAVED_SEGMENT",
      { name, filters },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "saved_segment",
        targetId: segment.id,
      }
    );

    return NextResponse.json({ segment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al guardar segmento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
