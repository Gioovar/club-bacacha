import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data });
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
