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
    const { scoringRules, loyaltyThresholds } = body;

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

    await logAdminAudit(
      "UPDATE_SYSTEM_CONFIG",
      { scoringRules, loyaltyThresholds },
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
