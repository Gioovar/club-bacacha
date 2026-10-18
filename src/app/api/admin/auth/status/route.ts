import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, isAdminSetupNeeded } from "@/lib/admin/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    const setupNeeded = await isAdminSetupNeeded();

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        setupNeeded,
      });
    }

    return NextResponse.json({
      authenticated: true,
      setupNeeded: false,
      user: session.user,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al verificar sesión";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
