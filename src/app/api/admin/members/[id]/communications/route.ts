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
    const { channel, templateSlug, messagePreview, phone } = body;

    if (!channel) {
      return NextResponse.json({ error: "Canal de comunicación requerido" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    const { data: logEntry, error } = await supabase
      .from("communication_logs")
      .insert({
        member_id: id,
        channel, // 'WHATSAPP_CLICK', 'EMAIL_SENT', 'MANUAL_CALL', 'NOTE'
        template_slug: templateSlug || null,
        message_preview: messagePreview || null,
        phone: phone || null,
        actor_name: session.user.name || "Administrador Compartido",
        metadata: {
          timestamp: new Date().toISOString(),
          note: "Registro de apertura de enlace/contacto. No confirma recepción o lectura por el usuario.",
        },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAudit(
      "LOG_COMMUNICATION",
      { channel, templateSlug },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "member",
        targetId: id,
      }
    );

    return NextResponse.json({ log: logEntry });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al registrar comunicación";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
