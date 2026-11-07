import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SCANNER_COOKIE_NAME,
  computeOperationalShiftDate,
  getScannerSession,
  getVisitLoyaltyRules,
  listStaffEmployees,
  logoutScannerSession,
} from "@/lib/scanner/staff-server";
import { formatMemberBadge, formatMemberFullName } from "@/lib/members/welcome";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Base de datos no disponible" },
      { status: 500 }
    );
  }

  const [session, rules, allEmployees] = await Promise.all([
    getScannerSession(req),
    getVisitLoyaltyRules(supabase),
    listStaffEmployees(supabase),
  ]);

  const activeEmployees = allEmployees
    .filter((e) => e.status !== "INACTIVO")
    .map(({ password_hash: _ph, ...safe }) => safe);

  const selectedEmployeeId =
    req.nextUrl.searchParams.get("employeeId") ||
    session?.employee?.id ||
    activeEmployees[0]?.id ||
    "staff_general";

  const selectedEmployee = activeEmployees.find(
    (e) => e.id === selectedEmployeeId
  ) ||
    session?.employee || {
      id: "staff_general",
      name: "Staff Club Bacachá",
      phone: "",
      username: "staff",
      role: "HOSTESS" as const,
      status: "ACTIVO" as const,
      must_change_password: false,
      visits_registered_count: 0,
      last_login_at: null,
      last_active_at: null,
      created_by: "Sistema",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

  const shiftDate = computeOperationalShiftDate(
    new Date(),
    rules.shift_cutoff_hour,
    rules.timezone
  );

  // Consultar operaciones recientes registradas en el scanner
  const { data: actRows } = await supabase
    .from("member_activity")
    .select(
      "id, member_id, activity_type, metadata, created_at, members ( id, member_number, first_name, last_name )"
    )
    .eq("activity_type", "VISIT_REGISTERED")
    .order("created_at", { ascending: false })
    .limit(150);

  let shiftVisitsCount = 0;
  let totalVisitsCount = 0;
  const recentOperations: Array<{
    id: string;
    memberId: string;
    memberNumber: string;
    formattedNumber: string;
    memberName: string;
    visitNumber: number;
    shiftDate: string;
    visitedAt: string;
    employeeName: string;
  }> = [];

  for (const row of actRows || []) {
    const meta = (row.metadata || {}) as Record<string, any>;
    totalVisitsCount += 1;

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
        employeeName: meta.employee_name || "Staff Club Bacachá",
      });
    }
  }

  return NextResponse.json({
    authenticated: true,
    employee: selectedEmployee,
    employees: activeEmployees,
    mustChangePassword: false,
    shiftDate,
    shiftCutoffHour: rules.shift_cutoff_hour,
    shiftVisitsCount,
    totalVisitsCount,
    recentOperations,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

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

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno en scanner" },
      { status: 500 }
    );
  }
}
