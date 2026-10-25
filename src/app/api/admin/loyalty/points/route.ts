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

    // 1. Fetch all members with their transactions
    const { data: members, error: mErr } = await supabase
      .from("members")
      .select(`
        id,
        member_number,
        first_name,
        last_name,
        phone,
        email,
        city,
        membership_level,
        status,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 });
    }

    // 2. Fetch latest balance per member from transactions
    const { data: transactions } = await supabase
      .from("loyalty_transactions")
      .select("id, member_id, amount, balance_after, type, description, created_at, created_by")
      .order("created_at", { ascending: false });

    const txMap = new Map<string, any[]>();
    (transactions || []).forEach((tx) => {
      const list = txMap.get(tx.member_id) || [];
      list.push(tx);
      txMap.set(tx.member_id, list);
    });

    const membersWithPoints = (members || []).map((m) => {
      const userTxs = txMap.get(m.id) || [];
      const balance = userTxs.length > 0 ? userTxs[0].balance_after : 50; // default 50 welcome bonus

      return {
        id: m.id,
        memberNumber: m.member_number,
        fullName: `${m.first_name} ${m.last_name}`,
        phone: m.phone,
        email: m.email,
        city: m.city,
        tier: m.membership_level,
        status: m.status,
        pointsBalance: balance,
        transactionsCount: userTxs.length,
        lastTransaction: userTxs[0] || null,
      };
    });

    return NextResponse.json({
      members: membersWithPoints,
      totalCount: membersWithPoints.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al listar puntos de socios" }, { status: 500 });
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
    const { memberId, amount, type = "MANUAL_ADJUSTMENT", reason } = body;

    const numAmount = parseInt(amount, 10);
    if (!memberId || isNaN(numAmount) || numAmount === 0) {
      return NextResponse.json({ error: "Socio y monto de puntos válidos son requeridos" }, { status: 400 });
    }

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ error: "Se requiere un motivo o nota de auditoría" }, { status: 400 });
    }

    // 1. Locate member
    const { data: member, error: mErr } = await supabase
      .from("members")
      .select("id, member_number, first_name, last_name")
      .eq("id", memberId)
      .maybeSingle();

    if (mErr || !member) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 });
    }

    // 2. Calculate current balance
    const { data: lastTx } = await supabase
      .from("loyalty_transactions")
      .select("balance_after")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentBalance = lastTx ? lastTx.balance_after : 50;
    const newBalance = currentBalance + numAmount;

    if (newBalance < 0) {
      return NextResponse.json(
        { error: `No se puede deducir más puntos del saldo actual (${currentBalance} pts)` },
        { status: 400 }
      );
    }

    // 3. Insert transaction
    const { data: createdTx, error: txErr } = await supabase
      .from("loyalty_transactions")
      .insert({
        member_id: member.id,
        amount: numAmount,
        balance_after: newBalance,
        type: type,
        description: reason.trim(),
        metadata: {
          adminUser: session.user.username,
          adminId: session.user.id,
        },
        created_by: session.user.name || session.user.username,
      })
      .select()
      .single();

    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 500 });
    }

    // 4. Log admin audit
    await logAdminAudit(
      "LOYALTY_POINTS_ADJUSTMENT",
      {
        memberId: member.id,
        memberNumber: member.member_number,
        memberName: `${member.first_name} ${member.last_name}`,
        amount: numAmount,
        previousBalance: currentBalance,
        newBalance: newBalance,
        reason: reason.trim(),
      },
      {
        adminUserId: session.user.id,
        actorName: session.user.name || session.user.username,
        targetType: "member",
        targetId: member.id,
      }
    );

    return NextResponse.json({
      success: true,
      transaction: createdTx,
      newBalance,
      member: {
        id: member.id,
        memberNumber: member.member_number,
        fullName: `${member.first_name} ${member.last_name}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al ajustar puntos" }, { status: 500 });
  }
}
