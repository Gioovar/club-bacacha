import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { getMemberQrFichaByToken } from "@/lib/members/qr-ficha-server";
import {
  checkMemberVisitInShift,
  computeOperationalShiftDate,
  extractQrTokenFromScan,
  getScannerSession,
  getVisitLoyaltyRules,
  registerAtomicStaffVisit,
} from "@/lib/scanner/staff-server";

async function resolveQrTokenInput(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  rawInput: string
): Promise<string> {
  const extracted = extractQrTokenFromScan(rawInput);
  if (!extracted) return "";

  // Si el empleado ingresó un número de socio (ej. "#000049" o "49"), resolver su qr_token real
  if (/^#?\d{1,6}$/.test(extracted)) {
    const digits = extracted.replace(/\D/g, "").padStart(6, "0");
    const { data: memberByNum } = await supabase
      .from("members")
      .select("qr_token")
      .eq("member_number", digits)
      .maybeSingle();

    if (memberByNum?.qr_token) {
      return memberByNum.qr_token;
    }
  }

  return extracted;
}

export async function POST(req: NextRequest) {
  try {
    // El registro y consulta de scanner requiere sesión de empleado autorizado o administrador
    const scannerSession = await getScannerSession(req);
    const adminSession = scannerSession ? null : await getAdminSession(req);

    if (!scannerSession && !adminSession) {
      return NextResponse.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          error:
            "Se requiere una sesión activa de empleado autorizado en /scanner para consultar o registrar visitas.",
        },
        { status: 401 }
      );
    }

    const activeActor = scannerSession
      ? {
          id: scannerSession.employee.id,
          name: scannerSession.employee.name,
          role: scannerSession.employee.role,
        }
      : {
          id: `admin_${adminSession!.user.id}`,
          name: adminSession!.user.name,
          role: "GERENTE",
        };

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", error: "Base de datos no disponible." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "consult");
    const rawQrInput = String(body.qrToken || body.token || "").trim();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!rawQrInput) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_QR",
          error: "Escanea un código QR válido o ingresa el número de socio.",
        },
        { status: 400 }
      );
    }

    const resolvedToken = await resolveQrTokenInput(supabase, rawQrInput);

    if (action === "consult") {
      const ficha = await getMemberQrFichaByToken(resolvedToken, {
        recordScan: true,
      });

      if (!ficha) {
        await logAdminAudit(
          "SCANNER_INVALID_OR_REVOKED_QR",
          {
            attemptedTokenPrefix: resolvedToken.slice(0, 10),
            employeeId: activeActor.id,
            employeeName: activeActor.name,
          },
          {
            actorName: `${activeActor.name} (${activeActor.role})`,
            targetType: "qr_token",
            ip,
          }
        );

        return NextResponse.json(
          {
            ok: false,
            code: "INVALID_QR",
            error:
              "CREDENCIAL QR NO VÁLIDA O REVOCADA. Este código no pertenece a ningún socio activo o fue revocado por seguridad.",
          },
          { status: 404 }
        );
      }

      const rules = await getVisitLoyaltyRules(supabase);
      const shiftDate = computeOperationalShiftDate(
        new Date(),
        rules.shift_cutoff_hour,
        rules.timezone
      );

      const shiftCheck = await checkMemberVisitInShift(
        supabase,
        ficha.member.id,
        shiftDate
      );

      return NextResponse.json({
        ok: true,
        ficha,
        shiftCheck,
        actor: activeActor,
      });
    }

    if (action === "register_visit") {
      const result = await registerAtomicStaffVisit({
        qrToken: resolvedToken,
        employee: activeActor,
        ip,
      });

      if (!result.ok) {
        if (result.code === "INVALID_QR") {
          await logAdminAudit(
            "SCANNER_INVALID_OR_REVOKED_QR",
            {
              attemptedTokenPrefix: resolvedToken.slice(0, 10),
              employeeId: activeActor.id,
              employeeName: activeActor.name,
            },
            {
              actorName: `${activeActor.name} (${activeActor.role})`,
              targetType: "qr_token",
              ip,
            }
          );
        }

        return NextResponse.json(result, {
          status: result.code === "INVALID_QR" ? 404 : 400,
        });
      }

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { ok: false, error: "Acción no reconocida" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        code: "SERVER_ERROR",
        error: err?.message || "Error al procesar escaneo QR",
      },
      { status: 500 }
    );
  }
}
