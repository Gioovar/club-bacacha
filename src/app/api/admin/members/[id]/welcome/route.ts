import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildMemberVerificationUrl,
  formatMemberBadge,
  normalizeWhatsAppPhone,
  renderWelcomeMessage,
  WelcomeChannel,
  WelcomeStatus,
} from "@/lib/members/welcome";
import {
  ensureMemberQrToken,
  getGeneralWelcomeTemplate,
  getMemberWelcomeHistory,
  recordWelcomeEvent,
} from "@/lib/members/welcome-server";
import { getWhatsAppProvider } from "@/lib/messaging/whatsapp";

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
      return NextResponse.json({ error: "ID de miembro requerido" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    const { data: member, error: mErr } = await supabase
      .from("members")
      .select(
        "id, member_number, first_name, last_name, phone, email, city, status, membership_level, qr_token, marketing_consent, created_at"
      )
      .eq("id", id)
      .single();

    if (mErr || !member) {
      return NextResponse.json({ error: "Miembro no encontrado en Supabase" }, { status: 404 });
    }

    const qrToken = await ensureMemberQrToken(supabase, member);
    const verificationUrl = buildMemberVerificationUrl(qrToken);
    const generalTemplate = await getGeneralWelcomeTemplate(supabase);
    const renderedDefaultMessage = renderWelcomeMessage(generalTemplate, member);
    const phoneInfo = normalizeWhatsAppPhone(member.phone);
    const history = await getMemberWelcomeHistory(supabase, member.id);
    const waProvider = getWhatsAppProvider();

    return NextResponse.json({
      member: {
        ...member,
        qr_token: qrToken,
      },
      qrToken,
      verificationUrl,
      generalTemplate,
      renderedDefaultMessage,
      phoneInfo,
      whatsappApiConfigured: waProvider.enabled,
      history,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al cargar datos de bienvenida";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    const { data: member, error: mErr } = await supabase
      .from("members")
      .select(
        "id, member_number, first_name, last_name, phone, email, city, status, membership_level, qr_token, marketing_consent, created_at"
      )
      .eq("id", id)
      .single();

    if (mErr || !member) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    const qrToken = await ensureMemberQrToken(supabase, member);
    const body = await req.json().catch(() => ({}));
    const action = (body.action || "prepare_whatsapp") as
      | "download"
      | "prepare_whatsapp"
      | "confirm_manual_sent"
      | "send_whatsapp_api";

    const generalTemplate = await getGeneralWelcomeTemplate(supabase);
    const rawMessage =
      typeof body.message === "string" && body.message.trim().length > 0
        ? body.message.trim()
        : generalTemplate;

    // Sustituir {nombre} y {numero} en caso de que el mensaje aún contenga placeholders
    const finalMessage = renderWelcomeMessage(rawMessage, member);
    const phoneInfo = normalizeWhatsAppPhone(member.phone);

    let channel: WelcomeChannel = "WHATSAPP_MANUAL";
    let status: WelcomeStatus = "preparado";
    let providerMessageId: string | null = null;
    let waUrl: string | null = null;

    if (action === "download") {
      channel = "DOWNLOAD_PNG";
      status = "preparado";
    } else if (action === "prepare_whatsapp") {
      if (!phoneInfo.valid) {
        return NextResponse.json(
          { error: phoneInfo.error || "Teléfono inválido para WhatsApp" },
          { status: 400 }
        );
      }
      channel = "WHATSAPP_MANUAL";
      status = "preparado";
      waUrl = `https://wa.me/${phoneInfo.normalized}?text=${encodeURIComponent(
        finalMessage
      )}`;
    } else if (action === "confirm_manual_sent") {
      if (!phoneInfo.valid) {
        return NextResponse.json(
          { error: phoneInfo.error || "Teléfono inválido" },
          { status: 400 }
        );
      }
      channel = "WHATSAPP_MANUAL";
      status = "enviado";
    } else if (action === "send_whatsapp_api") {
      if (!phoneInfo.valid) {
        return NextResponse.json(
          { error: phoneInfo.error || "Teléfono inválido para WhatsApp" },
          { status: 400 }
        );
      }
      const waProvider = getWhatsAppProvider();
      if (!waProvider.enabled) {
        return NextResponse.json(
          {
            error:
              "La integración oficial de WhatsApp Business API no está configurada. Utiliza la apertura asistida de WhatsApp con descarga de PNG.",
          },
          { status: 400 }
        );
      }

      channel = "WHATSAPP_API";
      const sendRes = await waProvider.sendTemplate({
        to: phoneInfo.normalized,
        template: "welcome",
        variables: [
          `${member.first_name} ${member.last_name}`.trim(),
          formatMemberBadge(member.member_number),
        ],
      });

      if (sendRes.ok) {
        status = "enviado";
        providerMessageId = sendRes.id || null;
      } else {
        status = "error";
        await recordWelcomeEvent(supabase, {
          memberId: member.id,
          phone: phoneInfo.normalized,
          adminUserId: session.user.id,
          actorName: session.user.name,
          channel,
          status: "error",
          lastMessage: finalMessage,
          extraMetadata: { error_reason: sendRes.reason },
        });
        return NextResponse.json(
          { error: `Error del proveedor de WhatsApp: ${sendRes.reason}` },
          { status: 502 }
        );
      }
    }

    const record = await recordWelcomeEvent(supabase, {
      memberId: member.id,
      phone: phoneInfo.normalized || member.phone,
      adminUserId: session.user.id,
      actorName: session.user.name,
      channel,
      status,
      lastMessage: finalMessage,
      providerMessageId,
      extraMetadata: {
        action,
        qr_token_prefix: `${qrToken.substring(0, 8)}...`,
        member_number: member.member_number,
      },
    });

    await logAdminAudit(
      `WELCOME_${action.toUpperCase()}`,
      {
        memberId: member.id,
        memberNumber: member.member_number,
        channel,
        status,
        phone: phoneInfo.normalized || member.phone,
      },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "member",
        targetId: member.id,
      }
    );

    const history = await getMemberWelcomeHistory(supabase, member.id);

    return NextResponse.json({
      success: true,
      record,
      status,
      channel,
      waUrl,
      finalMessage,
      phoneInfo,
      history,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al procesar bienvenida";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

