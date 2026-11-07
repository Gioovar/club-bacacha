import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/admin/crypto";
import { logAdminAudit } from "@/lib/admin/session";
import {
  SCANNER_COOKIE_NAME,
  computeOperationalShiftDate,
  getScannerSession,
  getVisitLoyaltyRules,
  loginScannerStaff,
  logoutScannerSession,
  saveStaffEmployee,
} from "@/lib/scanner/staff-server";
import { formatMemberBadge, formatMemberFullName } from "@/lib/members/welcome";

export async function GET(req: NextRequest) {
  const session = await getScannerSession(req);
  if (!session) {
    return NextResponse.json(
      { authenticated: false, error: "Sesión no iniciada" },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Base de datos no disponible" },
      { status: 500 }
    );
  }

  const rules = await getVisitLoyaltyRules(supabase);
  const shiftDate = computeOperationalShiftDate(
    new Date(),
    rules.shift_cutoff_hour,
    rules.timezone
  );

  // Consultar operaciones recientes registradas por este empleado
  const { data: actRows } = await supabase
    .from("member_activity")
    .select(
      "id, member_id, activity_type, metadata, created_at, members ( id, member_number, first_name, last_name )"
    )
    .eq("activity_type", "VISIT_REGISTERED")
    .order("created_at", { ascending: false })
    .limit(150);

  let shiftVisitsCount = 0;
  const recentOperations: Array<{
    id: string;
    memberId: string;
    memberNumber: string;
    formattedNumber: string;
    memberName: string;
    visitNumber: number;
    shiftDate: string;
    visitedAt: string;
  }> = [];

  for (const row of actRows || []) {
    const meta = (row.metadata || {}) as Record<string, any>;
    const matchesEmployee =
      meta.employee_id === session.employee.id ||
      meta.employee_name === session.employee.name;

    if (!matchesEmployee) continue;

    const rowShift =
      meta.shift_date ||
      computeOperationalShiftDate(
        new Date(row.created_at),
        rules.shift_cutoff_hour,
        rules.timezone
      );

    if (rowShift === shiftDate) {
      shiftVisitsCount += 1;
    }

    if (recentOperations.length < 25) {
      const mRel = Array.isArray(row.members) ? row.members[0] : row.members;
      const memberNumber = mRel?.member_number || meta.member_number || "000000";
      const memberName = mRel
        ? formatMemberFullName(mRel)
        : meta.member_name || "Socio Club Bacachá";

      recentOperations.push({
        id: row.id,
        memberId: row.member_id,
        memberNumber,
        formattedNumber: formatMemberBadge(memberNumber),
        memberName,
        visitNumber: Number(meta.visit_number || 1),
        shiftDate: rowShift,
        visitedAt: meta.visited_at || row.created_at,
      });
    }
  }

  const { password_hash: _ph, ...safeEmployee } = session.employee;

  return NextResponse.json({
    authenticated: true,
    employee: safeEmployee,
    mustChangePassword: Boolean(session.employee.must_change_password),
    shiftDate,
    shiftCutoffHour: rules.shift_cutoff_hour,
    shiftVisitsCount,
    recentOperations,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "login");
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    if (action === "logout") {
      const rawToken = req.cookies.get(SCANNER_COOKIE_NAME)?.value;
      await logoutScannerSession(rawToken, ip);

      const response = NextResponse.json({ ok: true });
      response.cookies.set(SCANNER_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    if (action === "change_password") {
      const session = await getScannerSession(req);
      if (!session) {
        return NextResponse.json(
          { error: "Sesión no válida o expirada." },
          { status: 401 }
        );
      }

      const newPassword = String(body.newPassword || "");
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "La nueva contraseña debe tener al menos 8 caracteres." },
          { status: 400 }
        );
      }

      const supabase = createAdminClient();
      if (!supabase) {
        return NextResponse.json(
          { error: "Base de datos no disponible." },
          { status: 500 }
        );
      }

      const passwordHash = await hashPassword(newPassword);
      const nowIso = new Date().toISOString();

      const updated = await saveStaffEmployee(supabase, {
        ...session.employee,
        password_hash: passwordHash,
        must_change_password: false,
        temp_password_expires_at: null,
        updated_at: nowIso,
      });

      await logAdminAudit(
        "SCANNER_PASSWORD_CHANGED",
        { employeeId: updated.id, employeeName: updated.name },
        {
          actorName: updated.name,
          targetType: "staff_employee",
          targetId: updated.id,
          ip,
        }
      );

      const { password_hash: _ph, ...safeEmployee } = updated;
      return NextResponse.json({
        ok: true,
        employee: safeEmployee,
        mustChangePassword: false,
      });
    }

    // action === "login"
    const identifier = String(body.identifier || "").trim();
    const password = String(body.password || "");

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Ingresa tu teléfono o usuario y tu contraseña." },
        { status: 400 }
      );
    }

    const result = await loginScannerStaff(identifier, password, ip, userAgent);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const { password_hash: _ph, ...safeEmployee } = result.employee;

    const response = NextResponse.json({
      ok: true,
      employee: safeEmployee,
      mustChangePassword: result.mustChangePassword,
    });

    response.cookies.set(SCANNER_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 16 * 3600,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno en autenticación de scanner" },
      { status: 500 }
    );
  }
}

