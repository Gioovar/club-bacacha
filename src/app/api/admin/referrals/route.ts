import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
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

    // Fetch referrals with referrer and referred details
    const { data: referrals, error } = await supabase
      .from("member_referrals")
      .select(`
        id,
        campaign,
        status,
        created_at,
        referrer:referrer_member_id (
          id,
          member_number,
          first_name,
          last_name,
          phone,
          city
        ),
        referred:referred_member_id (
          id,
          member_number,
          first_name,
          last_name,
          city,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ambassador Ranking
    const referrerStats: Record<string, { member: any; count: number }> = {};
    (referrals || []).forEach((r: any) => {
      if (r.referrer) {
        const id = r.referrer.id;
        if (!referrerStats[id]) {
          referrerStats[id] = { member: r.referrer, count: 0 };
        }
        if (r.status === "REGISTERED" || r.status === "QUALIFIED" || r.status === "REWARDED") {
          referrerStats[id].count += 1;
        }
      }
    });

    const ambassadors = Object.values(referrerStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      referrals: referrals || [],
      ambassadors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener referidos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
