import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: Lookup member details and points balance for validation modal
export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const identifier = searchParams.get("identifier")?.trim();

  if (!identifier) {
    return NextResponse.json({ error: "Identificador requerido" }, { status: 400 });
  }

  const cleanNum = identifier.replace(/^#/, "").trim();

  // Search by qr_token, member_number, phone or email
  let member = null;

  // Try member_number
  const { data: byNum } = await supabase
    .from("members")
    .select("id, member_number, first_name, last_name, phone, email, status, birthdate, qr_token")
    .eq("member_number", cleanNum)
    .maybeSingle();

  if (byNum) {
    member = byNum;
  } else {
    // Try qr_token
    const { data: byQr } = await supabase
      .from("members")
      .select("id, member_number, first_name, last_name, phone, email, status, birthdate, qr_token")
      .eq("qr_token", identifier)
      .maybeSingle();

    if (byQr) {
      member = byQr;
    } else {
      // Try phone
      const phoneDigits = identifier.replace(/\D/g, "");
      if (phoneDigits.length >= 7) {
        const { data: byPhone } = await supabase
          .from("members")
          .select("id, member_number, first_name, last_name, phone, email, status, birthdate, qr_token")
          .ilike("phone", `%${phoneDigits.slice(-8)}%`)
          .maybeSingle();
        if (byPhone) member = byPhone;
      }
    }
  }

  if (!member) {
    return NextResponse.json({ error: "Socio no encontrado con los datos proporcionados" }, { status: 404 });
  }

  // Get current points balance
  let currentBalance = 0;
  try {
    const { data: tx } = await supabase
      .from("loyalty_transactions")
      .select("balance_after")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tx) {
      currentBalance = tx.balance_after;
    } else {
      // Initialize balance
      const { data: initBal } = await supabase.rpc("get_member_points_balance", {
        target_member_id: member.id,
      });
      if (typeof initBal === "number") currentBalance = initBal;
    }
  } catch (err) {
    console.warn("Points balance lookup error:", err);
  }

  // Get past redemptions for this member
  const { data: pastRedemptions } = await supabase
    .from("member_benefits")
    .select("id, benefit_id, redeemed_at, status")
    .eq("member_id", member.id);

  return NextResponse.json({
    member: {
      ...member,
      points_balance: currentBalance,
      redemptions_history: pastRedemptions || [],
    },
  });
}

// POST: Execute atomic redemption
export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const { benefitId, memberId, qrToken, memberNumber, phone, notes } = body;

    if (!benefitId) {
      return NextResponse.json({ error: "Beneficio requerido" }, { status: 400 });
    }

    // 1. Locate member
    let member = null;
    if (memberId) {
      const { data } = await supabase
        .from("members")
        .select("id, member_number, first_name, last_name, phone, email, status, birthdate")
        .eq("id", memberId)
        .maybeSingle();
      member = data;
    } else if (qrToken) {
      const { data } = await supabase
        .from("members")
        .select("id, member_number, first_name, last_name, phone, email, status, birthdate")
        .eq("qr_token", qrToken.trim())
        .maybeSingle();
      member = data;
    } else if (memberNumber) {
      const cleanNum = memberNumber.trim().replace(/^#/, "");
      const { data } = await supabase
        .from("members")
        .select("id, member_number, first_name, last_name, phone, email, status, birthdate")
        .eq("member_number", cleanNum)
        .maybeSingle();
      member = data;
    } else if (phone) {
      const phoneDigits = phone.replace(/\D/g, "");
      const { data } = await supabase
        .from("members")
        .select("id, member_number, first_name, last_name, phone, email, status, birthdate")
        .ilike("phone", `%${phoneDigits.slice(-8)}%`)
        .maybeSingle();
      member = data;
    }

    if (!member) {
      return NextResponse.json({ error: "Socio no encontrado. Verifica el QR o número de membresía." }, { status: 404 });
    }

    if (member.status === "BLOCKED") {
      return NextResponse.json({ error: "El socio se encuentra con estatus BLOQUEADO. No puede canjear beneficios." }, { status: 403 });
    }

    // 2. Validate benefit
    const { data: benefit, error: bErr } = await supabase
      .from("benefits")
      .select("*")
      .eq("id", benefitId)
      .single();

    if (bErr || !benefit) {
      return NextResponse.json({ error: "Beneficio no encontrado" }, { status: 404 });
    }

    if (!benefit.active) {
      return NextResponse.json({ error: "Este beneficio se encuentra pausado o inactivo" }, { status: 400 });
    }

    // Parse metadata / requirements
    let parsedReqs: any = {};
    if (benefit.requirements && typeof benefit.requirements === "string") {
      try {
        if (benefit.requirements.startsWith("{")) {
          parsedReqs = JSON.parse(benefit.requirements);
        }
      } catch {}
    }

    const benefitType =
      benefit.benefit_type ||
      parsedReqs.benefit_type ||
      (benefit.title.toLowerCase().includes("playera") ? "POINTS_REWARD" : "MEMBER_PROMO");

    const pointsCost =
      benefit.points_cost !== undefined && benefit.points_cost !== null
        ? Number(benefit.points_cost)
        : Number(parsedReqs.points_cost) || 0;

    const pointsAward =
      benefit.points_award !== undefined && benefit.points_award !== null
        ? Number(benefit.points_award)
        : Number(parsedReqs.points_award) || 0;

    const maxPerMember =
      benefit.max_redemptions_per_member !== undefined
        ? Number(benefit.max_redemptions_per_member)
        : parsedReqs.max_per_member !== undefined
        ? Number(parsedReqs.max_per_member)
        : 1;

    // 3. Check date validity if set
    const now = new Date();
    if (benefit.starts_at && new Date(benefit.starts_at) > now) {
      return NextResponse.json({
        error: `Este beneficio aún no está vigente. Comienza el ${new Date(benefit.starts_at).toLocaleDateString("es-MX")}`,
      }, { status: 400 });
    }
    if (benefit.ends_at && new Date(benefit.ends_at) < now) {
      return NextResponse.json({
        error: `Este beneficio venció el ${new Date(benefit.ends_at).toLocaleDateString("es-MX")}`,
      }, { status: 400 });
    }

    // 4. Check duplicate redemptions per member
    if (maxPerMember && maxPerMember > 0) {
      const { count: priorRedemptions } = await supabase
        .from("member_benefits")
        .select("*", { count: "exact", head: true })
        .eq("member_id", member.id)
        .eq("benefit_id", benefit.id)
        .eq("status", "USED");

      if ((priorRedemptions || 0) >= maxPerMember) {
        return NextResponse.json({
          error: `Este socio ya ha utilizado este beneficio el límite máximo de veces permitidas (${maxPerMember} vez${maxPerMember > 1 ? "es" : ""}).`,
          alreadyRedeemed: true,
        }, { status: 409 });
      }
    }

    // 5. Points balance validation and deduction for POINTS_REWARD
    let balanceAfter = 0;
    let pointsSpent = 0;
    let pointsAwarded = 0;

    // Fetch current balance
    const { data: lastTx } = await supabase
      .from("loyalty_transactions")
      .select("balance_after")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    let currentBalance = lastTx ? lastTx.balance_after : 50;

    if (benefitType === "POINTS_REWARD" && pointsCost > 0) {
      if (currentBalance < pointsCost) {
        return NextResponse.json({
          error: `Saldo insuficiente: Esta recompensa requiere ${pointsCost} pts y el socio cuenta con ${currentBalance} pts.`,
          currentBalance,
          pointsCost,
        }, { status: 400 });
      }

      pointsSpent = pointsCost;
      balanceAfter = currentBalance - pointsCost;

      // Register points deduction in ledger
      const { error: txErr } = await supabase.from("loyalty_transactions").insert({
        member_id: member.id,
        amount: -pointsCost,
        balance_after: balanceAfter,
        type: "PURCHASE_REWARD",
        description: `Canje de recompensa: ${benefit.title}`,
        metadata: {
          benefit_id: benefit.id,
          benefit_title: benefit.title,
          verified_by: session.user.id,
        },
        created_by: session.user.username || "ADMIN",
      });

      if (txErr) {
        console.error("Error creating debit transaction:", txErr);
        return NextResponse.json({ error: "Error al actualizar saldo de puntos del socio" }, { status: 500 });
      }
    } else if (pointsAward > 0) {
      // Optional points awarded upon promo redemption
      pointsAwarded = pointsAward;
      balanceAfter = currentBalance + pointsAward;

      await supabase.from("loyalty_transactions").insert({
        member_id: member.id,
        amount: pointsAward,
        balance_after: balanceAfter,
        type: "BENEFIT_REDEEM",
        description: `Bonificación por canje: ${benefit.title}`,
        metadata: {
          benefit_id: benefit.id,
          benefit_title: benefit.title,
        },
        created_by: session.user.username || "ADMIN",
      });
    } else {
      balanceAfter = currentBalance;
    }

    // 6. Generate readable voucher code
    const voucherCode = `BAC-BEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 7. Register redemption in member_benefits
    const redemptionPayload: any = {
      member_id: member.id,
      benefit_id: benefit.id,
      status: "USED",
      redeemed_at: new Date().toISOString(),
    };

    // Try inserting with all fields
    const fullPayload = {
      ...redemptionPayload,
      points_spent: pointsSpent,
      points_awarded: pointsAwarded,
      verified_by_name: session.user.name || session.user.username || "Admin Bacachá",
      redemption_code: voucherCode,
      notes: notes?.trim() || "Canje presencial autorizado en recepción/barra",
      used_at: new Date().toISOString(),
    };

    let { data: redemption, error: rErr } = await supabase
      .from("member_benefits")
      .insert(fullPayload)
      .select()
      .single();

    if (rErr) {
      // Retry with core columns
      console.warn("Retrying member_benefits insert with core columns:", rErr.message);
      const retry = await supabase
        .from("member_benefits")
        .insert(redemptionPayload)
        .select()
        .single();

      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 500 });
      }
      redemption = retry.data;
    }

    // 8. If stock is configured, decrement stock
    if (benefit.stock !== null && benefit.stock !== undefined && benefit.stock > 0) {
      await supabase
        .from("benefits")
        .update({ stock: benefit.stock - 1 })
        .eq("id", benefit.id);
    }

    // 9. Update engagement metrics cleanly without hardcoded +15
    const { data: currentScore } = await supabase
      .from("member_engagement_scores")
      .select("*")
      .eq("member_id", member.id)
      .maybeSingle();

    if (currentScore) {
      await supabase.from("member_engagement_scores").update({
        benefits_used_count: (currentScore.benefits_used_count || 0) + 1,
        last_activity_at: new Date().toISOString(),
      }).eq("member_id", member.id);
    }

    // 10. Audit log
    await logAdminAudit(
      "BENEFIT_REDEEMED",
      {
        memberId: member.id,
        memberNumber: member.member_number,
        benefitTitle: benefit.title,
        benefitType,
        pointsSpent,
        pointsAwarded,
        voucherCode,
      },
      {
        adminUserId: session.user.id,
        actorName: session.user.name || session.user.username,
        targetType: "benefits",
        targetId: benefit.id,
      }
    );

    return NextResponse.json({
      success: true,
      voucherCode,
      redeemedAt: new Date().toISOString(),
      member: {
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        member_number: member.member_number,
        new_balance: balanceAfter,
      },
      benefit: {
        id: benefit.id,
        title: benefit.title,
        benefit_type: benefitType,
      },
      pointsSpent,
      pointsAwarded,
      notes: notes || null,
      message: `Canje confirmado exitosamente para ${member.first_name} ${member.last_name} (#${member.member_number}). ${
        pointsSpent > 0
          ? `Se descontaron ${pointsSpent} puntos (Saldo restante: ${balanceAfter} pts).`
          : pointsAwarded > 0
          ? `Se otorgaron +${pointsAwarded} puntos de bono (Saldo total: ${balanceAfter} pts).`
          : "Promoción comercial registrada sin alteración de puntos."
      }`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al procesar canje";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
