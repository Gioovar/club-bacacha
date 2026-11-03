import { randomBytes } from "node:crypto";
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
    if (!id) {
      return NextResponse.json({ error: "ID de miembro requerido" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = (body.reason || "Revocación administrativa por seguridad").trim();

    const { data: currentMember, error: fetchErr } = await supabase
      .from("members")
      .select("id, member_number, first_name, last_name, qr_token")
      .eq("id", id)
      .single();

    if (fetchErr || !currentMember) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    // Generar nuevo token criptográfico único de 48 caracteres hex (24 bytes)
    let newQrToken = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = randomBytes(24).toString("hex");
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("qr_token", candidate)
        .maybeSingle();

      if (!existing) {
        newQrToken = candidate;
        break;
      }
    }

    if (!newQrToken) {
      return NextResponse.json(
        { error: "No se pudo generar un identificador QR único." },
        { status: 500 }
      );
    }

    const oldTokenPrefix = currentMember.qr_token
      ? `${currentMember.qr_token.substring(0, 8)}...`
      : "none";

    const { data: updatedMember, error: updateErr } = await supabase
      .from("members")
      .update({
        qr_token: newQrToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, member_number, first_name, last_name, qr_token, updated_at")
      .single();

    if (updateErr || !updatedMember) {
      return NextResponse.json(
        { error: updateErr?.message || "Error al actualizar el código QR" },
        { status: 500 }
      );
    }

    // Registrar en bitácora de actividad del socio
    await supabase.from("member_activity").insert({
      member_id: id,
      activity_type: "QR_REGENERATED",
      metadata: {
        previous_token_prefix: oldTokenPrefix,
        new_token_prefix: `${newQrToken.substring(0, 8)}...`,
        revoked_by: session.user.name,
        reason,
      },
    });

    // Registrar en auditoría administrativa
    await logAdminAudit(
      "REVOKE_AND_REGENERATE_QR",
      {
        memberNumber: currentMember.member_number,
        previousTokenPrefix: oldTokenPrefix,
        newTokenPrefix: `${newQrToken.substring(0, 8)}...`,
        reason,
      },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "member",
        targetId: id,
      }
    );

    return NextResponse.json({
      success: true,
      qrToken: updatedMember.qr_token,
      member: updatedMember,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al revocar y regenerar QR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

