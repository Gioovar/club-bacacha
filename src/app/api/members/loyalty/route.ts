import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LoyaltyReward, LoyaltyTransaction, LoyaltyRedemption } from "@/lib/members/types";

// Fallback initial rewards if database table is empty or initializing
const DEFAULT_REWARDS: LoyaltyReward[] = [
  {
    id: "rew-playera",
    title: "Playera Oficial Club Bacachá",
    description: "Edición limitada en algodón peinado negro mate con logotipo Bacachá en serigrafía de alta densidad.",
    pointsCost: 150,
    category: "MERCHANDISE",
    stock: 50,
    active: true,
    terms: "Sujeto a disponibilidad de tallas (S, M, L, XL). Entrega presencial en barra o recepción del Club.",
  },
  {
    id: "rew-gorra",
    title: "Gorra Negra Bordada Bacachá",
    description: "Gorra snapback premium negra con bordado tonal de alta definición del Club.",
    pointsCost: 100,
    category: "MERCHANDISE",
    stock: 40,
    active: true,
    terms: "Entrega presencial mostrando tu código de canje en puerta o barra.",
  },
  {
    id: "rew-botella",
    title: "Botella Bacachá Tradicional en Mesa",
    description: "Botella servida en mesa con cortesía de mezcladores para ti y tus acompañantes.",
    pointsCost: 300,
    category: "BOTTLE",
    stock: 20,
    active: true,
    terms: "Válido en noches de apertura con reservación previa o cupo disponible.",
  },
  {
    id: "rew-mojitos",
    title: "Ronda de Mojitos Bacachá (2 Personas)",
    description: "Dos mojitos preparados al momento con menta fresca, limón y ron Bacachá.",
    pointsCost: 60,
    category: "COURTESY",
    stock: 100,
    active: true,
    terms: "Válido directamente en barra presentando tu código QR de canje.",
  },
  {
    id: "rew-vip",
    title: "Acceso VIP + Saludo DJ en Cabina",
    description: "Entrada prioritaria sin fila para 2 personas y acceso temporal a la zona de cabina.",
    pointsCost: 200,
    category: "EXPERIENCE",
    stock: 15,
    active: true,
    terms: "Requiere confirmación previa 24 horas antes del evento.",
  },
];

// In-memory fallback ledger for dev/offline resilience
const fallbackTransactions = new Map<string, LoyaltyTransaction[]>();
const fallbackRedemptions = new Map<string, LoyaltyRedemption[]>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qrToken = searchParams.get("qrToken");

    if (!qrToken) {
      return NextResponse.json({ error: "Token de miembro requerido" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (!supabase) {
      // Offline fallback
      const txs = fallbackTransactions.get(qrToken) || [
        {
          id: "tx-welcome",
          memberId: "demo-member",
          amount: 50,
          balanceAfter: 50,
          type: "WELCOME_BONUS",
          description: "Bono de bienvenida Club Bacachá",
          createdAt: new Date().toISOString(),
        },
      ];
      fallbackTransactions.set(qrToken, txs);

      const redemptions = fallbackRedemptions.get(qrToken) || [];
      const balance = txs.length > 0 ? txs[txs.length - 1].balanceAfter : 50;

      return NextResponse.json({
        pointsBalance: balance,
        transactions: txs,
        rewards: DEFAULT_REWARDS,
        redemptions,
      });
    }

    // 1. Locate member
    const { data: member, error: mErr } = await supabase
      .from("members")
      .select("id, member_number, first_name, last_name, membership_level, created_at")
      .eq("qr_token", qrToken.trim())
      .maybeSingle();

    if (mErr || !member) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 });
    }

    // 2. Fetch or initialize points balance and transactions
    const { data: rawTxs } = await supabase
      .from("loyalty_transactions")
      .select("*")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false });

    let transactions: LoyaltyTransaction[] = (rawTxs || []).map((t: any) => ({
      id: t.id,
      memberId: t.member_id,
      amount: t.amount,
      balanceAfter: t.balance_after,
      type: t.type,
      description: t.description,
      createdAt: t.created_at,
      createdBy: t.created_by,
    }));

    let currentBalance = 0;

    if (transactions.length === 0) {
      // Auto-credit 50 pts welcome bonus
      const welcomeBonus: LoyaltyTransaction = {
        id: "tx_init_" + member.id.slice(0, 8),
        memberId: member.id,
        amount: 50,
        balanceAfter: 50,
        type: "WELCOME_BONUS",
        description: "Bono de bienvenida Club Bacachá",
        createdAt: new Date().toISOString(),
        createdBy: "SYSTEM",
      };

      try {
        await supabase.from("loyalty_transactions").insert({
          member_id: member.id,
          amount: 50,
          balance_after: 50,
          type: "WELCOME_BONUS",
          description: "Bono de bienvenida Club Bacachá",
          metadata: { auto: true },
          created_by: "SYSTEM",
        });
      } catch {
        // Table may be migrating, continue gracefully
      }

      transactions = [welcomeBonus];
      currentBalance = 50;
    } else {
      currentBalance = transactions[0].balanceAfter;
    }

    // 3. Fetch rewards catalog
    let rewards = DEFAULT_REWARDS;
    try {
      const { data: dbRewards } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("active", true)
        .order("points_cost", { ascending: true });

      if (dbRewards && dbRewards.length > 0) {
        rewards = dbRewards.map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          pointsCost: r.points_cost,
          category: r.category,
          imageUrl: r.image_url,
          stock: r.stock,
          active: r.active,
          terms: r.terms,
          createdAt: r.created_at,
        }));
      }
    } catch {
      // Use DEFAULT_REWARDS
    }

    // 4. Fetch redemptions
    let redemptions: LoyaltyRedemption[] = [];
    try {
      const { data: dbReds } = await supabase
        .from("loyalty_redemptions")
        .select("*")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false });

      if (dbReds) {
        redemptions = dbReds.map((red: any) => ({
          id: red.id,
          memberId: red.member_id,
          rewardId: red.reward_id,
          rewardTitle: red.reward_title,
          pointsSpent: red.points_spent,
          status: red.status,
          redemptionCode: red.redemption_code,
          notes: red.notes,
          fulfilledAt: red.fulfilled_at,
          fulfilledBy: red.fulfilled_by,
          createdAt: red.created_at,
        }));
      }
    } catch {
      // continue empty
    }

    return NextResponse.json({
      pointsBalance: currentBalance,
      transactions,
      rewards,
      redemptions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al consultar lealtad" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { qrToken, rewardId, notes } = body;

    if (!qrToken || !rewardId) {
      return NextResponse.json({ error: "Token de miembro y recompensa requeridos" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (!supabase) {
      // Offline fallback handling
      const txs = fallbackTransactions.get(qrToken) || [
        {
          id: "tx-welcome",
          memberId: "demo-member",
          amount: 50,
          balanceAfter: 50,
          type: "WELCOME_BONUS",
          description: "Bono de bienvenida Club Bacachá",
          createdAt: new Date().toISOString(),
        },
      ];
      const curBal = txs[txs.length - 1].balanceAfter;
      const targetReward = DEFAULT_REWARDS.find((r) => r.id === rewardId) || DEFAULT_REWARDS[0];

      if (curBal < targetReward.pointsCost) {
        return NextResponse.json({ error: "Saldo de puntos insuficiente para este premio" }, { status: 400 });
      }

      const newBal = curBal - targetReward.pointsCost;
      const redCode = "BC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const newTx: LoyaltyTransaction = {
        id: "tx-" + Date.now(),
        memberId: "demo-member",
        amount: -targetReward.pointsCost,
        balanceAfter: newBal,
        type: "PURCHASE_REWARD",
        description: `Canje: ${targetReward.title}`,
        createdAt: new Date().toISOString(),
      };
      txs.push(newTx);
      fallbackTransactions.set(qrToken, txs);

      const red: LoyaltyRedemption = {
        id: "red-" + Date.now(),
        memberId: "demo-member",
        rewardId: targetReward.id,
        rewardTitle: targetReward.title,
        pointsSpent: targetReward.pointsCost,
        status: "PENDING",
        redemptionCode: redCode,
        createdAt: new Date().toISOString(),
      };
      const userReds = fallbackRedemptions.get(qrToken) || [];
      userReds.unshift(red);
      fallbackRedemptions.set(qrToken, userReds);

      return NextResponse.json({
        success: true,
        redemption: red,
        pointsBalance: newBal,
      });
    }

    // 1. Locate member
    const { data: member, error: mErr } = await supabase
      .from("members")
      .select("id, member_number, first_name, last_name")
      .eq("qr_token", qrToken.trim())
      .maybeSingle();

    if (mErr || !member) {
      return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 });
    }

    // 2. Locate reward
    let reward: LoyaltyReward | null = null;
    const { data: dbReward } = await supabase
      .from("loyalty_rewards")
      .select("*")
      .eq("id", rewardId)
      .eq("active", true)
      .maybeSingle();

    if (dbReward) {
      reward = {
        id: dbReward.id,
        title: dbReward.title,
        description: dbReward.description,
        pointsCost: dbReward.points_cost,
        category: dbReward.category,
        stock: dbReward.stock,
        active: dbReward.active,
      };
    } else {
      reward = DEFAULT_REWARDS.find((r) => r.id === rewardId) || null;
    }

    if (!reward) {
      return NextResponse.json({ error: "Premio no encontrado o no disponible" }, { status: 404 });
    }

    // 3. Check current balance
    const { data: lastTx } = await supabase
      .from("loyalty_transactions")
      .select("balance_after")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentBalance = lastTx ? lastTx.balance_after : 50;

    if (currentBalance < reward.pointsCost) {
      return NextResponse.json(
        {
          error: `Saldo insuficiente. Tienes ${currentBalance} pts y necesitas ${reward.pointsCost} pts para ${reward.title}.`,
        },
        { status: 400 }
      );
    }

    const newBalance = currentBalance - reward.pointsCost;
    const redemptionCode = "BC-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // 4. Create redemption record
    const { data: createdRedemption, error: redErr } = await supabase
      .from("loyalty_redemptions")
      .insert({
        member_id: member.id,
        reward_id: reward.id.startsWith("rew-") ? undefined : reward.id,
        reward_title: reward.title,
        points_spent: reward.pointsCost,
        status: "PENDING",
        redemption_code: redemptionCode,
        notes: notes || null,
      })
      .select()
      .maybeSingle();

    // 5. Append ledger transaction
    await supabase.from("loyalty_transactions").insert({
      member_id: member.id,
      amount: -reward.pointsCost,
      balance_after: newBalance,
      type: "PURCHASE_REWARD",
      description: `Canje: ${reward.title}`,
      metadata: {
        redemption_code: redemptionCode,
        reward_id: reward.id,
      },
      created_by: "MEMBER_PORTAL",
    });

    // 6. Log member activity
    await supabase.from("member_activity").insert({
      member_id: member.id,
      activity_type: "BENEFIT_CLAIM",
      metadata: {
        reward_title: reward.title,
        points_spent: reward.pointsCost,
        redemption_code: redemptionCode,
      },
    });

    return NextResponse.json({
      success: true,
      redemption: createdRedemption || {
        id: "red_" + Date.now(),
        memberId: member.id,
        rewardId: reward.id,
        rewardTitle: reward.title,
        pointsSpent: reward.pointsCost,
        status: "PENDING",
        redemptionCode,
        createdAt: new Date().toISOString(),
      },
      pointsBalance: newBalance,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error al procesar el canje" }, { status: 500 });
  }
}
