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

    const { data: configs, error } = await supabase.from("admin_config").select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const configMap: Record<string, any> = {};
    (configs || []).forEach((c) => {
      configMap[c.key] = c.value;
    });

    return NextResponse.json({ config: configMap });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener configuración";
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
    const {
      scoringRules,
      loyaltyThresholds,
      welcomeMessageTemplate,
      visitLoyaltyRules,
    } = body;

    if (scoringRules) {
      await supabase.from("admin_config").upsert({
        key: "scoring_rules",
        value: scoringRules,
        description: "Puntuaciones base para Bacachá Engagement Score",
        updated_at: new Date().toISOString(),
      });
    }

    if (loyaltyThresholds) {
      await supabase.from("admin_config").upsert({
        key: "loyalty_thresholds",
        value: loyaltyThresholds,
        description: "Umbrales automáticos de categorización de miembros",
        updated_at: new Date().toISOString(),
      });
    }

    if (visitLoyaltyRules && typeof visitLoyaltyRules === "object") {
      await supabase.from("admin_config").upsert({
        key: "visit_loyalty_rules",
        value: {
          shift_cutoff_hour: Math.min(
            23,
            Math.max(0, Number(visitLoyaltyRules.shift_cutoff_hour ?? 6))
          ),
          timezone: visitLoyaltyRules.timezone || "America/Mexico_City",
          points_per_visit_enabled: Boolean(
            visitLoyaltyRules.points_per_visit_enabled
          ),
          points_per_visit: Math.max(
            0,
            Number(visitLoyaltyRules.points_per_visit ?? 20)
          ),
          milestone_visits_threshold: Math.max(
            1,
            Number(visitLoyaltyRules.milestone_visits_threshold ?? 5)
          ),
          updated_by: session.user.name || "Administrador Compartido",
          updated_at: new Date().toISOString(),
        },
        description:
          "Reglas de corte de jornada y puntos por visita en el sistema de Scanner",
        updated_at: new Date().toISOString(),
      });
    }

    if (typeof welcomeMessageTemplate === "string" && welcomeMessageTemplate.trim().length > 0) {
      await supabase.from("admin_config").upsert({
        key: "welcome_message_template",
        value: {
          text: welcomeMessageTemplate.trim(),
          updated_by: session.user.name || "Administrador Compartido",
          updated_at: new Date().toISOString(),
        },
        description: "Plantilla general predeterminada para el envío de bienvenida y credencial digital",
        updated_at: new Date().toISOString(),
      });
    }

    await logAdminAudit(
      "UPDATE_SYSTEM_CONFIG",
      {
        scoringRules: Boolean(scoringRules),
        loyaltyThresholds: Boolean(loyaltyThresholds),
        visitLoyaltyRules: Boolean(visitLoyaltyRules),
        welcomeMessageTemplateUpdated: typeof welcomeMessageTemplate === "string",
      },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "admin_config",
      }
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al actualizar configuración";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
