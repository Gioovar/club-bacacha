import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const { data: events, error } = await admin
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch checkins and registrations with social plans
  const { data: allCheckins } = await admin
    .from("event_checkins")
    .select("event_id, social_plan");

  const { data: allRegistrations } = await admin
    .from("event_registrations")
    .select("event_id, social_plan");

  const enrichedEvents = (events || []).map((evt) => {
    const checkins = (allCheckins || []).filter((c) => c.event_id === evt.id);
    const regs = (allRegistrations || []).filter((r) => r.event_id === evt.id);

    const planCounts: Record<string, number> = {
      PLAN_LIGUE: 0,
      HACER_AMIGOS: 0,
      EN_PAREJA: 0,
      SOLO_DIVERTIRME: 0,
      SIN_ETIQUETA: 0,
    };

    // Priority to checkins, fallback to registrations
    const combinedPlans = [
      ...regs.map((r) => r.social_plan),
      ...checkins.map((c) => c.social_plan),
    ];

    combinedPlans.forEach((p) => {
      if (p && planCounts[p] !== undefined) {
        planCounts[p]++;
      } else if (p) {
        planCounts.SIN_ETIQUETA++;
      }
    });

    return {
      ...evt,
      checkinsCount: checkins.length,
      registrationsCount: regs.length,
      socialPlans: planCounts,
    };
  });

  return NextResponse.json({ events: enrichedEvents });
}

export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { slug, name, description, image_url, venue, city, event_date, event_time, status, members_only } = body;

  const { data, error } = await admin
    .from("events")
    .insert({
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      description,
      image_url: image_url || "/images/dj_crowd.jpg",
      venue,
      city: city || "Acapulco",
      event_date,
      event_time,
      status: status || "published",
      members_only: Boolean(members_only),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { id, ...updates } = body;
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 422 });
  }

  const { data, error } = await admin
    .from("events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
