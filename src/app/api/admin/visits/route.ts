import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin/session";
import {
  computeOperationalShiftDate,
  getVisitLoyaltyRules,
  listStaffEmployees,
} from "@/lib/scanner/staff-server";
import { formatMemberBadge, formatMemberFullName } from "@/lib/members/welcome";

export interface UnifiedVisitEntry {
  id: string;
  memberId: string;
  memberNumber: string;
  formattedNumber: string;
  memberName: string;
  memberStatus: string;
  membershipLevel: string;
  employeeId: string | null;
  employeeName: string;
  employeeRole: string;
  shiftDate: string;
  visitNumber: number;
  pointsAwarded: number;
  visitedAt: string;
  source: "SCANNER_VISIT" | "EVENT_CHECKIN";
}

function getLocalHourInTimezone(date: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    return Number.isNaN(h) ? 0 : h % 24;
  } catch {
    return date.getUTCHours();
  }
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Base de datos no disponible" },
      { status: 500 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const dateFrom = (sp.get("dateFrom") || "").trim();
  const dateTo = (sp.get("dateTo") || "").trim();
  const memberSearch = (sp.get("memberSearch") || "").trim().toLowerCase();
  const employeeIdFilter = (sp.get("employeeId") || "").trim();
  const format = (sp.get("format") || "json").toLowerCase();

  const [
    rules,
    employees,
    membersRes,
    visitActivityRes,
    checkinsRes,
  ] = await Promise.all([
    getVisitLoyaltyRules(supabase),
    listStaffEmployees(supabase),
    supabase
      .from("members")
      .select(
        "id, member_number, first_name, last_name, status, membership_level, created_at"
      ),
    supabase
      .from("member_activity")
      .select("id, member_id, activity_type, metadata, created_at")
      .in("activity_type", ["VISIT_REGISTERED", "EVENT_ATTENDANCE"])
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("event_checkins")
      .select("id, member_id, checked_in_at, checked_in_by, events(name)")
      .order("checked_in_at", { ascending: false })
      .limit(1000),
  ]);

  const memberMap = new Map<
    string,
    {
      id: string;
      member_number: string;
      full_name: string;
      formatted_number: string;
      status: string;
      membership_level: string;
    }
  >();

  for (const m of membersRes.data || []) {
    memberMap.set(m.id, {
      id: m.id,
      member_number: m.member_number,
      full_name: formatMemberFullName(m),
      formatted_number: formatMemberBadge(m.member_number),
      status: m.status,
      membership_level: m.membership_level,
    });
  }

  const allVisits: UnifiedVisitEntry[] = [];
  const seenKeys = new Set<string>();

  for (const row of visitActivityRes.data || []) {
    const meta = (row.metadata || {}) as Record<string, any>;
    const mInfo = memberMap.get(row.member_id);
    const visitedAt = meta.visited_at || row.created_at;
    const shiftDate =
      meta.shift_date ||
      computeOperationalShiftDate(
        new Date(visitedAt),
        rules.shift_cutoff_hour,
        rules.timezone
      );

    const dedupKey = `${row.member_id}:${shiftDate}`;
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    allVisits.push({
      id: row.id,
      memberId: row.member_id,
      memberNumber: mInfo?.member_number || "000000",
      formattedNumber: mInfo?.formatted_number || "#000000",
      memberName: mInfo?.full_name || "Socio Club Bacachá",
      memberStatus: mInfo?.status || "ACTIVE",
      membershipLevel: mInfo?.membership_level || "MEMBER",
      employeeId: meta.employee_id || null,
      employeeName:
        meta.employee_name || meta.verified_by || "Personal Club Bacachá",
      employeeRole: meta.employee_role || "STAFF",
      shiftDate,
      visitNumber: Number(meta.visit_number || 1),
      pointsAwarded: Number(meta.points_awarded || 0),
      visitedAt,
      source: "SCANNER_VISIT",
    });
  }

  for (const chk of checkinsRes.data || []) {
    const mInfo = memberMap.get(chk.member_id);
    const visitedAt = chk.checked_in_at;
    const shiftDate = computeOperationalShiftDate(
      new Date(visitedAt),
      rules.shift_cutoff_hour,
      rules.timezone
    );

    const dedupKey = `${chk.member_id}:${shiftDate}`;
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    allVisits.push({
      id: chk.id,
      memberId: chk.member_id,
      memberNumber: mInfo?.member_number || "000000",
      formattedNumber: mInfo?.formatted_number || "#000000",
      memberName: mInfo?.full_name || "Socio Club Bacachá",
      memberStatus: mInfo?.status || "ACTIVE",
      membershipLevel: mInfo?.membership_level || "MEMBER",
      employeeId: null,
      employeeName: chk.checked_in_by || "Check-in de Evento",
      employeeRole: "STAFF",
      shiftDate,
      visitNumber: 1,
      pointsAwarded: 0,
      visitedAt,
      source: "EVENT_CHECKIN",
    });
  }

  // Ordenar descendente por fecha real de visita
  allVisits.sort(
    (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
  );

  // Calcular contadores globales (día/jornada actual, semana, mes, miembros únicos)
  const now = new Date();
  const currentShiftDate = computeOperationalShiftDate(
    now,
    rules.shift_cutoff_hour,
    rules.timezone
  );
  const sevenDaysAgoMs = now.getTime() - 7 * 24 * 3600 * 1000;
  const thirtyDaysAgoMs = now.getTime() - 30 * 24 * 3600 * 1000;

  let todayVisits = 0;
  const uniqueMembersTodaySet = new Set<string>();
  const uniqueMembersAllTimeSet = new Set<string>();
  let weekVisits = 0;
  let monthVisits = 0;

  // Estadísticas por socio y por horario
  const memberVisitStats = new Map<
    string,
    {
      memberId: string;
      memberNumber: string;
      formattedNumber: string;
      memberName: string;
      membershipLevel: string;
      status: string;
      totalVisits: number;
      lastVisitAt: string;
      lastEmployeeName: string;
      lastEmployeeRole: string;
    }
  >();

  const hourlyCounts = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    count: 0,
  }));

  const employeeStatsMap = new Map<
    string,
    {
      id: string;
      name: string;
      role: string;
      status: string;
      visitsToday: number;
      visitsTotal: number;
      lastRegisteredAt: string | null;
    }
  >();

  for (const emp of employees) {
    employeeStatsMap.set(emp.id, {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      status: emp.status,
      visitsToday: 0,
      visitsTotal: 0,
      lastRegisteredAt: emp.last_active_at || null,
    });
  }

  for (const v of allVisits) {
    const vTime = new Date(v.visitedAt).getTime();
    uniqueMembersAllTimeSet.add(v.memberId);

    if (v.shiftDate === currentShiftDate) {
      todayVisits += 1;
      uniqueMembersTodaySet.add(v.memberId);
    }
    if (vTime >= sevenDaysAgoMs) {
      weekVisits += 1;
    }
    if (vTime >= thirtyDaysAgoMs) {
      monthVisits += 1;
    }

    const hourIdx = getLocalHourInTimezone(
      new Date(v.visitedAt),
      rules.timezone
    );
    if (hourlyCounts[hourIdx]) {
      hourlyCounts[hourIdx].count += 1;
    }

    const existingMemberStat = memberVisitStats.get(v.memberId);
    if (!existingMemberStat) {
      memberVisitStats.set(v.memberId, {
        memberId: v.memberId,
        memberNumber: v.memberNumber,
        formattedNumber: v.formattedNumber,
        memberName: v.memberName,
        membershipLevel: v.membershipLevel,
        status: v.memberStatus,
        totalVisits: 1,
        lastVisitAt: v.visitedAt,
        lastEmployeeName: v.employeeName,
        lastEmployeeRole: v.employeeRole,
      });
    } else {
      existingMemberStat.totalVisits += 1;
    }

    // Contabilizar por empleado
    const empKey = v.employeeId || `name:${v.employeeName}`;
    let empStat = v.employeeId ? employeeStatsMap.get(v.employeeId) : undefined;
    if (!empStat) {
      // Buscar por nombre si no tenía ID directo
      for (const item of employeeStatsMap.values()) {
        if (item.name.toLowerCase() === v.employeeName.toLowerCase()) {
          empStat = item;
          break;
        }
      }
    }
    if (!empStat) {
      empStat = {
        id: empKey,
        name: v.employeeName,
        role: v.employeeRole,
        status: "ACTIVO",
        visitsToday: 0,
        visitsTotal: 0,
        lastRegisteredAt: v.visitedAt,
      };
      employeeStatsMap.set(empKey, empStat);
    }

    empStat.visitsTotal += 1;
    if (v.shiftDate === currentShiftDate) {
      empStat.visitsToday += 1;
    }
    if (
      !empStat.lastRegisteredAt ||
      new Date(v.visitedAt) > new Date(empStat.lastRegisteredAt)
    ) {
      empStat.lastRegisteredAt = v.visitedAt;
    }
  }

  // Filtrar lista de visitas según parámetros de búsqueda
  const filteredVisits = allVisits.filter((v) => {
    if (dateFrom && v.shiftDate < dateFrom) return false;
    if (dateTo && v.shiftDate > dateTo) return false;
    if (employeeIdFilter) {
      const matchId = v.employeeId === employeeIdFilter;
      const matchName =
        v.employeeName.toLowerCase() === employeeIdFilter.toLowerCase();
      if (!matchId && !matchName) return false;
    }
    if (memberSearch) {
      const haystack = `${v.memberName} ${v.memberNumber} ${v.formattedNumber}`.toLowerCase();
      if (!haystack.includes(memberSearch)) return false;
    }
    return true;
  });

  if (format === "csv") {
    const headers = [
      "Fecha Jornada",
      "Fecha y Hora Exacta",
      "Member ID",
      "Nombre del Socio",
      "Nivel",
      "Estado",
      "Visita Número",
      "Registrado Por",
      "Rol Empleado",
      "Puntos Otorgados",
    ];

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredVisits.map((v) =>
      [
        v.shiftDate,
        v.visitedAt,
        v.formattedNumber,
        v.memberName,
        v.membershipLevel,
        v.memberStatus,
        v.visitNumber,
        v.employeeName,
        v.employeeRole,
        v.pointsAwarded,
      ]
        .map(escapeCsv)
        .join(",")
    );

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="visitas-club-bacacha-${currentShiftDate}.csv"`,
      },
    });
  }

  const topMembers = Array.from(memberVisitStats.values())
    .sort((a, b) => {
      if (b.totalVisits !== a.totalVisits) return b.totalVisits - a.totalVisits;
      return (
        new Date(b.lastVisitAt).getTime() - new Date(a.lastVisitAt).getTime()
      );
    })
    .slice(0, 20);

  const byEmployee = Array.from(employeeStatsMap.values()).sort(
    (a, b) => b.visitsTotal - a.visitsTotal
  );

  const peakHours = [...hourlyCounts]
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return NextResponse.json({
    currentShiftDate,
    rules,
    metrics: {
      todayVisits,
      uniqueMembersToday: uniqueMembersTodaySet.size,
      uniqueMembersAllTime: uniqueMembersAllTimeSet.size,
      weekVisits,
      monthVisits,
      totalVisitsAllTime: allVisits.length,
    },
    topMembers,
    byEmployee,
    hourlyDistribution: hourlyCounts,
    peakHours,
    visits: filteredVisits.slice(0, 500),
    totalFiltered: filteredVisits.length,
  });
}

