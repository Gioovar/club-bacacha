import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { hashPassword } from "@/lib/admin/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatMemberBadge,
  formatMemberFullName,
  normalizeWhatsAppPhone,
} from "@/lib/members/welcome";
import {
  buildStaffInvitationWhatsAppMessage,
  createStaffInvitation,
  getStaffEmployeeById,
  listStaffEmployees,
  revokeAllEmployeeSessions,
  saveStaffEmployee,
  StaffEmployee,
  StaffRole,
} from "@/lib/scanner/staff-server";

const VALID_ROLES: StaffRole[] = ["MESERO", "HOSTESS", "SUPERVISOR", "GERENTE"];

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Base de datos no disponible" },
        { status: 503 }
      );
    }

    const employees = await listStaffEmployees(supabase);

    // Consultar historial de visitas registradas en member_activity para enriquecer estadísticas por empleado
    const { data: visitLogs } = await supabase
      .from("member_activity")
      .select(`
        id,
        member_id,
        metadata,
        created_at,
        members:member_id (
          id,
          member_number,
          first_name,
          last_name
        )
      `)
      .eq("activity_type", "VISIT_REGISTERED")
      .order("created_at", { ascending: false })
      .limit(500);

    const visitsByEmployeeId = new Map<string, any[]>();
    const visitsByEmployeeName = new Map<string, any[]>();

    for (const row of visitLogs || []) {
      const meta = (row.metadata || {}) as Record<string, any>;
      const empId = meta.employee_id || "";
      const empName = (meta.employee_name || meta.verified_by || "").toLowerCase();
      const memberObj = Array.isArray(row.members) ? row.members[0] : row.members;

      const entry = {
        id: row.id,
        visited_at: meta.visited_at || row.created_at,
        shift_date: meta.shift_date || row.created_at.split("T")[0],
        visit_number: meta.visit_number || 1,
        member_id: row.member_id,
        member_number: memberObj?.member_number
          ? formatMemberBadge(memberObj.member_number)
          : "—",
        member_name: memberObj ? formatMemberFullName(memberObj) : "Socio",
      };

      if (empId) {
        const arr = visitsByEmployeeId.get(empId) || [];
        arr.push(entry);
        visitsByEmployeeId.set(empId, arr);
      }
      if (empName) {
        const arr = visitsByEmployeeName.get(empName) || [];
        arr.push(entry);
        visitsByEmployeeName.set(empName, arr);
      }
    }

    const enrichedEmployees = employees.map((emp) => {
      const empVisits =
        visitsByEmployeeId.get(emp.id) ||
        visitsByEmployeeName.get(emp.name.toLowerCase()) ||
        [];
      const realCount = Math.max(
        emp.visits_registered_count || 0,
        empVisits.length
      );

      // Quitar password_hash antes de enviar al navegador
      const { password_hash, ...safeEmp } = emp;
      return {
        ...safeEmp,
        has_password: Boolean(password_hash),
        visits_registered_count: realCount,
        recent_visits: empVisits.slice(0, 15),
      };
    });

    return NextResponse.json({
      employees: enrichedEmployees,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al obtener empleados";
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
      return NextResponse.json(
        { error: "Base de datos no disponible" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const name = (body.name || "").trim();
    const rawPhone = (body.phone || "").trim();
    const role = (body.role || "HOSTESS").trim().toUpperCase() as StaffRole;

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "El nombre del empleado es obligatorio." },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Rol no válido. Usa MESERO, HOSTESS, SUPERVISOR o GERENTE." },
        { status: 400 }
      );
    }

    const phoneInfo = normalizeWhatsAppPhone(rawPhone);
    if (!phoneInfo.valid) {
      return NextResponse.json(
        { error: phoneInfo.error || "Teléfono inválido." },
        { status: 400 }
      );
    }

    // Verificar que no exista otro empleado con el mismo teléfono
    const existingList = await listStaffEmployees(supabase);
    const duplicate = existingList.find(
      (e) => e.phone.replace(/\D/g, "") === phoneInfo.normalized
    );

    if (duplicate) {
      return NextResponse.json(
        {
          error: `Ya existe un empleado registrado con ese teléfono (${duplicate.name} · ${duplicate.role}). Puedes reenviarle su invitación desde la lista.`,
        },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const cleanSlug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u306f]/g, "")
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "");

    const newEmployee: StaffEmployee = {
      id: crypto.randomUUID(),
      name,
      phone: phoneInfo.normalized,
      username: `${cleanSlug}.${phoneInfo.normalized.slice(-4)}`,
      role,
      status: "PENDIENTE_ACTIVACION",
      password_hash: null,
      must_change_password: false,
      temp_password_expires_at: null,
      visits_registered_count: 0,
      last_login_at: null,
      last_active_at: null,
      created_by: session.user.name || "Administrador Compartido",
      created_at: nowIso,
      updated_at: nowIso,
    };

    const saved = await saveStaffEmployee(supabase, newEmployee);

    // Generar invitación inicial firmada y de un solo uso
    const invite = await createStaffInvitation(
      supabase,
      saved.id,
      session.user.name || "Administrador Compartido"
    );

    const whatsappMessage = buildStaffInvitationWhatsAppMessage({
      name: saved.name,
      role: saved.role,
      activationUrl: invite.activationUrl,
    });

    const waUrl = `https://wa.me/${phoneInfo.normalized}?text=${encodeURIComponent(
      whatsappMessage
    )}`;

    await logAdminAudit(
      "STAFF_EMPLOYEE_CREATED",
      {
        employeeId: saved.id,
        name: saved.name,
        phone: saved.phone,
        role: saved.role,
        status: saved.status,
      },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "staff_employee",
        targetId: saved.id,
      }
    );

    const { password_hash: _, ...safeSaved } = saved;

    return NextResponse.json({
      success: true,
      employee: safeSaved,
      invitation: {
        activationUrl: invite.activationUrl,
        expiresAt: invite.expiresAt,
        whatsappMessage,
        waUrl,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al crear empleado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Base de datos no disponible" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { employeeId, action } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "ID de empleado requerido" },
        { status: 400 }
      );
    }

    const employee = await getStaffEmployeeById(supabase, employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();

    // 1. Generar / Reenviar invitación por WhatsApp (sin duplicar al empleado)
    if (action === "send_invitation" || action === "reset_invitation") {
      const updatedEmp = await saveStaffEmployee(supabase, {
        ...employee,
        status:
          employee.status === "INACTIVO"
            ? "PENDIENTE_ACTIVACION"
            : employee.status,
        updated_at: nowIso,
      });

      const invite = await createStaffInvitation(
        supabase,
        updatedEmp.id,
        session.user.name || "Administrador Compartido"
      );

      const phoneInfo = normalizeWhatsAppPhone(updatedEmp.phone);
      const whatsappMessage = buildStaffInvitationWhatsAppMessage({
        name: updatedEmp.name,
        role: updatedEmp.role,
        activationUrl: invite.activationUrl,
      });

      const waUrl = phoneInfo.valid
        ? `https://wa.me/${phoneInfo.normalized}?text=${encodeURIComponent(
            whatsappMessage
          )}`
        : null;

      await logAdminAudit(
        "STAFF_INVITATION_SENT",
        {
          employeeId: updatedEmp.id,
          name: updatedEmp.name,
          role: updatedEmp.role,
          expiresAt: invite.expiresAt,
        },
        {
          actorName: session.user.name,
          adminUserId: session.user.id,
          targetType: "staff_employee",
          targetId: updatedEmp.id,
        }
      );

      return NextResponse.json({
        success: true,
        invitation: {
          activationUrl: invite.activationUrl,
          expiresAt: invite.expiresAt,
          whatsappMessage,
          waUrl,
        },
      });
    }

    // 2. Asignar contraseña temporal única que caduca en 24h y obliga cambio al primer inicio
    if (action === "assign_temp_password") {
      const tempCode = `BAC-${crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase()}`;
      const passwordHash = await hashPassword(tempCode);
      const tempExpiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

      await revokeAllEmployeeSessions(supabase, employee.id);

      const updatedEmp = await saveStaffEmployee(supabase, {
        ...employee,
        status: "ACTIVO",
        password_hash: passwordHash,
        must_change_password: true,
        temp_password_expires_at: tempExpiresAt,
        updated_at: nowIso,
      });

      await logAdminAudit(
        "STAFF_TEMP_PASSWORD_ASSIGNED",
        {
          employeeId: updatedEmp.id,
          name: updatedEmp.name,
          expiresAt: tempExpiresAt,
        },
        {
          actorName: session.user.name,
          adminUserId: session.user.id,
          targetType: "staff_employee",
          targetId: updatedEmp.id,
        }
      );

      return NextResponse.json({
        success: true,
        tempPassword: tempCode,
        expiresAt: tempExpiresAt,
      });
    }

    // 3. Desactivar o Reactivar empleado
    if (action === "deactivate") {
      await revokeAllEmployeeSessions(supabase, employee.id);
      const updatedEmp = await saveStaffEmployee(supabase, {
        ...employee,
        status: "INACTIVO",
        updated_at: nowIso,
      });

      await logAdminAudit(
        "STAFF_EMPLOYEE_DEACTIVATED",
        { employeeId: updatedEmp.id, name: updatedEmp.name },
        {
          actorName: session.user.name,
          adminUserId: session.user.id,
          targetType: "staff_employee",
          targetId: updatedEmp.id,
        }
      );

      const { password_hash: _, ...safe } = updatedEmp;
      return NextResponse.json({ success: true, employee: safe });
    }

    if (action === "activate") {
      const nextStatus = employee.password_hash
        ? "ACTIVO"
        : "PENDIENTE_ACTIVACION";
      const updatedEmp = await saveStaffEmployee(supabase, {
        ...employee,
        status: nextStatus,
        updated_at: nowIso,
      });

      await logAdminAudit(
        "STAFF_EMPLOYEE_REACTIVATED",
        { employeeId: updatedEmp.id, name: updatedEmp.name, status: nextStatus },
        {
          actorName: session.user.name,
          adminUserId: session.user.id,
          targetType: "staff_employee",
          targetId: updatedEmp.id,
        }
      );

      const { password_hash: _, ...safe } = updatedEmp;
      return NextResponse.json({ success: true, employee: safe });
    }

    // 4. Actualizar puesto/rol o datos del empleado
    if (action === "update_details") {
      const nextRole =
        body.role && VALID_ROLES.includes(body.role)
          ? (body.role as StaffRole)
          : employee.role;
      const nextName =
        typeof body.name === "string" && body.name.trim()
          ? body.name.trim()
          : employee.name;

      let nextPhone = employee.phone;
      if (typeof body.phone === "string" && body.phone.trim()) {
        const pInfo = normalizeWhatsAppPhone(body.phone);
        if (!pInfo.valid) {
          return NextResponse.json(
            { error: pInfo.error || "Teléfono inválido" },
            { status: 400 }
          );
        }
        nextPhone = pInfo.normalized;
      }

      const updatedEmp = await saveStaffEmployee(supabase, {
        ...employee,
        name: nextName,
        phone: nextPhone,
        role: nextRole,
        updated_at: nowIso,
      });

      await logAdminAudit(
        "STAFF_EMPLOYEE_UPDATED",
        {
          employeeId: updatedEmp.id,
          name: updatedEmp.name,
          role: updatedEmp.role,
        },
        {
          actorName: session.user.name,
          adminUserId: session.user.id,
          targetType: "staff_employee",
          targetId: updatedEmp.id,
        }
      );

      const { password_hash: _, ...safe } = updatedEmp;
      return NextResponse.json({ success: true, employee: safe });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al actualizar empleado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
