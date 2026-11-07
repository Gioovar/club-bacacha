import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SCANNER_COOKIE_NAME,
  activateStaffEmployeeWithToken,
  loginScannerStaff,
  verifyStaffInvitationToken,
} from "@/lib/scanner/staff-server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { valid: false, error: "Base de datos no disponible." },
      { status: 500 }
    );
  }

  const check = await verifyStaffInvitationToken(supabase, token);
  if (!check.valid) {
    return NextResponse.json(
      { valid: false, error: check.error },
      { status: 400 }
    );
  }

  return NextResponse.json({
    valid: true,
    employee: {
      id: check.employee.id,
      name: check.employee.name,
      phone: check.employee.phone,
      username: check.employee.username,
      role: check.employee.role,
    },
    expiresAt: check.invitation.expires_at,
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Base de datos no disponible." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const token = String(body.token || "").trim();
    const password = String(body.password || "");
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const result = await activateStaffEmployeeWithToken(
      supabase,
      token,
      password,
      ip
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Iniciar sesión automáticamente en /scanner tras activar la cuenta
    const loginRes = await loginScannerStaff(
      result.employee.phone,
      password,
      ip,
      userAgent
    );

    const { password_hash: _ph, ...safeEmployee } = result.employee;
    const response = NextResponse.json({
      ok: true,
      employee: safeEmployee,
    });

    if (loginRes.ok) {
      response.cookies.set(SCANNER_COOKIE_NAME, loginRes.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 16 * 3600,
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error al activar acceso de empleado" },
      { status: 500 }
    );
  }
}

