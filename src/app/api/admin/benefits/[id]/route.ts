import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const { data: benefit, error: bErr } = await admin
    .from("benefits")
    .select("*")
    .eq("id", id)
    .single();

  if (bErr || !benefit) {
    return NextResponse.json({ error: "Beneficio no encontrado" }, { status: 404 });
  }

  // Fetch real redemptions with member details
  const { data: redemptions, error: rErr } = await admin
    .from("member_benefits")
    .select(`
      id,
      member_id,
      benefit_id,
      redeemed_at,
      status,
      verified_by,
      created_at
    `)
    .eq("benefit_id", id)
    .order("redeemed_at", { ascending: false });

  if (rErr) {
    console.error("Error fetching redemptions:", rErr);
  }

  // Enrich redemptions with member details
  const memberIds = Array.from(new Set((redemptions || []).map((r) => r.member_id)));
  let membersMap = new Map<string, any>();

  if (memberIds.length > 0) {
    const { data: members } = await admin
      .from("members")
      .select("id, member_number, first_name, last_name, phone, email, status")
      .in("id", memberIds);

    (members || []).forEach((m) => membersMap.set(m.id, m));
  }

  const enrichedRedemptions = (redemptions || []).map((r) => ({
    ...r,
    member: membersMap.get(r.member_id) || {
      first_name: "Socio",
      last_name: "Registrado",
      member_number: "---",
      phone: "",
    },
  }));

  return NextResponse.json({
    benefit,
    redemptions: enrichedRedemptions,
    redemptionsCount: enrichedRedemptions.length,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  // Check if benefit exists
  const { data: benefit, error: bErr } = await admin
    .from("benefits")
    .select("id, title, slug")
    .eq("id", id)
    .single();

  if (bErr || !benefit) {
    return NextResponse.json({ error: "Beneficio no encontrado" }, { status: 404 });
  }

  // Check for real dependencies (redemptions)
  const { count: redemptionsCount } = await admin
    .from("member_benefits")
    .select("*", { count: "exact", head: true })
    .eq("benefit_id", id);

  if ((redemptionsCount || 0) > 0 && !force) {
    return NextResponse.json(
      {
        error: `No es posible eliminar "${benefit.title}" porque tiene ${redemptionsCount} canje(s) histórico(s) registrado(s). Para proteger la trazabilidad de los socios, debes archivarlo en su lugar.`,
        canArchive: true,
        redemptionsCount,
      },
      { status: 409 }
    );
  }

  // Safe to delete if 0 redemptions or forced
  const { error: delErr } = await admin.from("benefits").delete().eq("id", id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  await logAdminAudit(
    "BENEFIT_DELETED",
    { title: benefit.title, slug: benefit.slug, redemptionsCount },
    {
      adminUserId: session.user.id,
      actorName: session.user.name || session.user.username,
      targetType: "benefits",
      targetId: id,
    }
  );

  try {
    const { revalidateTag, revalidatePath } = await import("next/cache");
    revalidateTag("benefits", { expire: 0 });
    revalidateTag("site-content", { expire: 0 });
    revalidatePath("/");
  } catch {}

  return NextResponse.json({
    success: true,
    message: `Beneficio "${benefit.title}" eliminado correctamente.`,
  });
}
