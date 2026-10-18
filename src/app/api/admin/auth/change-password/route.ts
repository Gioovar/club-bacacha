import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, changeAdminPassword, ADMIN_COOKIE_NAME } from "@/lib/admin/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Contraseña actual y nueva requeridas" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

    const result = await changeAdminPassword(currentPassword, newPassword, session.user.id, ip);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Sessions were revoked, delete cookie so user logs in with new password
    const response = NextResponse.json({ success: true });
    response.cookies.delete(ADMIN_COOKIE_NAME);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al cambiar contraseña";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
