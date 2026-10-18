import { NextRequest, NextResponse } from "next/server";
import { loginAdmin, ADMIN_COOKIE_NAME } from "@/lib/admin/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const result = await loginAdmin(password, ip, userAgent);

    if ("error" in result) {
      const status = result.locked ? 429 : 401;
      return NextResponse.json({ error: result.error }, { status });
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    // Set secure HttpOnly cookie
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 3600, // 24 hours
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error durante el inicio de sesión";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
