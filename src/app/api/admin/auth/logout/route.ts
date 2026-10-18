import { NextRequest, NextResponse } from "next/server";
import { logoutAdmin, ADMIN_COOKIE_NAME } from "@/lib/admin/session";

export async function POST(req: NextRequest) {
  try {
    const rawToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

    if (rawToken) {
      await logoutAdmin(rawToken, ip);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete(ADMIN_COOKIE_NAME);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al cerrar sesión";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
