import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildMemberVerificationUrl,
  normalizeWhatsAppPhone,
  renderWelcomeMessage,
} from "@/lib/members/welcome";
import {
  ensureMemberQrToken,
  getGeneralWelcomeTemplate,
  recordWelcomeEvent,
} from "@/lib/members/welcome-server";

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
    const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : [];
    const customTemplate: string | undefined = body.templateText;
    const recordPreparation = Boolean(body.recordPreparation);

    if (memberIds.length === 0) {
      return NextResponse.json(
        { error: "Selecciona al menos un miembro para preparar el lote." },
        { status: 400 }
      );
    }

    const { data: members, error } = await supabase
      .from("members")
      .select(
        "id, member_number, first_name, last_name, phone, email, city, status, membership_level, qr_token, marketing_consent, created_at"
      )
      .in("id", memberIds)
      .order("member_number", { ascending: false });

    if (error || !members) {
      return NextResponse.json(
        { error: error?.message || "No se pudieron obtener los miembros seleccionados" },
        { status: 500 }
      );
    }

    const generalTemplate = await getGeneralWelcomeTemplate(supabase);
    const activeTemplate =
      customTemplate && customTemplate.trim().length > 0
        ? customTemplate
        : generalTemplate;

    const items = [];

    for (const m of members) {
      const qrToken = await ensureMemberQrToken(supabase, m);
      const verificationUrl = buildMemberVerificationUrl(qrToken);
      const personalizedMessage = renderWelcomeMessage(activeTemplate, m);
      const phoneInfo = normalizeWhatsAppPhone(m.phone);
      const waUrl = phoneInfo.valid
        ? `https://wa.me/${phoneInfo.normalized}?text=${encodeURIComponent(
            personalizedMessage
          )}`
        : null;

      if (recordPreparation) {
        await recordWelcomeEvent(supabase, {
          memberId: m.id,
          phone: phoneInfo.normalized || m.phone,
          adminUserId: session.user.id,
          actorName: session.user.name,
          channel: "DOWNLOAD_PNG",
          status: "preparado",
          lastMessage: personalizedMessage,
          extraMetadata: {
            batch: true,
            member_number: m.member_number,
          },
        });
      }

      items.push({
        member: {
          ...m,
          qr_token: qrToken,
        },
        qrToken,
        verificationUrl,
        personalizedMessage,
        phoneInfo,
        waUrl,
      });
    }

    if (recordPreparation) {
      await logAdminAudit(
        "WELCOME_BATCH_PREPARED",
        {
          count: items.length,
          memberIds: items.map((i) => i.member.id),
        },
        {
          actorName: session.user.name,
          adminUserId: session.user.id,
          targetType: "members_batch",
        }
      );
    }

    return NextResponse.json({
      success: true,
      generalTemplate,
      activeTemplate,
      items,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al preparar bienvenidas en lote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

