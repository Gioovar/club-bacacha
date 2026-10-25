import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    // 1. Fetch rewards
    const { data: rewards, error: rewErr } = await supabase
      .from("loyalty_rewards")
      .select("*")
      .order("points_cost", { ascending: true });

    if (rewErr) {
      return NextResponse.json({ error: rewErr.message }, { status: 500 });
    }

    // 2. Fetch redemptions with member info
    const { data: redemptions, error: redErr } = await supabase
      .from("loyalty_redemptions")
      .select(`
        id,
        member_id,
        reward_id,
        reward_title,
        points_spent,
        status,
        redemption_code,
        notes,
        fulfilled_at,
        fulfilled_by,
        created_at,
        members:member_id (
          id,
          member_number,
          first_name,
          last_name,
          phone,
          email
        )
      `)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      rewards: rewards || [],
      redemptions: (redemptions || []).map((r: any) => ({
        id: r.id,
        memberId: r.member_id,
        rewardId: r.reward_id,
        rewardTitle: r.reward_title,
        pointsSpent: r.points_spent,
        status: r.status,
        redemptionCode: r.redemption_code,
        notes: r.notes,
        fulfilledAt: r.fulfilled_at,
        fulfilledBy: r.fulfilled_by,
        createdAt: r.created_at,
        member: r.members
          ? {
              id: r.members.id,
              memberNumber: r.members.member_number,
              name: `${r.members.first_name} ${r.members.last_name}`,
              phone: r.members.phone,
              email: r.members.email,
            }
          : null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al obtener recompensas" }, { status: 500 });
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
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, description, pointsCost, category = "MERCHANDISE", stock = 50, terms } = body;

    const numPoints = parseInt(pointsCost, 10);
    if (!title || isNaN(numPoints) || numPoints <= 0) {
      return NextResponse.json({ error: "Título y costo en puntos válidos son requeridos" }, { status: 400 });
    }

    const { data: created, error } = await supabase
      .from("loyalty_rewards")
      .insert({
        title: title.trim(),
        description: description?.trim() || "",
        points_cost: numPoints,
        category: category,
        stock: parseInt(stock, 10) || 50,
        terms: terms?.trim() || null,
        active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAudit(
      "LOYALTY_REWARD_CREATED",
      { title: created.title, pointsCost: created.points_cost, category: created.category },
      {
        adminUserId: session.user.id,
        actorName: session.user.name || session.user.username,
        targetType: "loyalty_reward",
        targetId: created.id,
      }
    );

    return NextResponse.json({ success: true, reward: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al crear recompensa" }, { status: 500 });
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
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const { redemptionId, status, notes } = body;

    if (!redemptionId || !["FULFILLED", "CANCELLED", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "ID de canje y estatus válido requeridos" }, { status: 400 });
    }

    // 1. Fetch current redemption
    const { data: redemption, error: rErr } = await supabase
      .from("loyalty_redemptions")
      .select("*")
      .eq("id", redemptionId)
      .single();

    if (rErr || !redemption) {
      return NextResponse.json({ error: "Canje no encontrado" }, { status: 404 });
    }

    // 2. If changing to FULFILLED
    const updatePayload: any = {
      status,
      notes: notes || redemption.notes,
      updated_at: new Date().toISOString(),
    };

    if (status === "FULFILLED") {
      updatePayload.fulfilled_at = new Date().toISOString();
      updatePayload.fulfilled_by = session.user.name || session.user.username;
    }

    // 3. If cancelling, refund points back to member
    if (status === "CANCELLED" && redemption.status !== "CANCELLED") {
      const { data: lastTx } = await supabase
        .from("loyalty_transactions")
        .select("balance_after")
        .eq("member_id", redemption.member_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const curBal = lastTx ? lastTx.balance_after : 0;
      const refundedBal = curBal + redemption.points_spent;

      await supabase.from("loyalty_transactions").insert({
        member_id: redemption.member_id,
        amount: redemption.points_spent,
        balance_after: refundedBal,
        type: "MANUAL_ADJUSTMENT",
        description: `Reembolso por canje cancelado: ${redemption.reward_title}`,
        metadata: { redemptionId, refundedBy: session.user.username },
        created_by: session.user.name || session.user.username,
      });
    }

    const { data: updated, error: updErr } = await supabase
      .from("loyalty_redemptions")
      .update(updatePayload)
      .eq("id", redemptionId)
      .select()
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    await logAdminAudit(
      "LOYALTY_REDEMPTION_UPDATED",
      {
        redemptionId: updated.id,
        code: updated.redemption_code,
        reward: updated.reward_title,
        status: updated.status,
      },
      {
        adminUserId: session.user.id,
        actorName: session.user.name || session.user.username,
        targetType: "loyalty_redemption",
        targetId: updated.id,
      }
    );

    return NextResponse.json({ success: true, redemption: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al actualizar canje" }, { status: 500 });
  }
}
