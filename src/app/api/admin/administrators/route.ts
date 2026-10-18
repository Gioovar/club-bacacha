import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
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

    // 1. Admin Users
    const { data: users, error: uErr } = await supabase
      .from("admin_users")
      .select("id, username, name, role, active, last_login_at, created_at")
      .order("created_at", { ascending: true });

    // 2. Active Sessions
    const { data: sessions, error: sErr } = await supabase
      .from("admin_sessions")
      .select("id, admin_user_id, ip_address, user_agent, expires_at, created_at, revoked")
      .eq("revoked", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    // 3. Audit Logs
    const { data: auditLogs, error: aErr } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      users: users || [],
      sessions: sessions || [],
      auditLogs: auditLogs || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener administradores";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
