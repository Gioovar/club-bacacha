import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("benefits")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ benefits: data });
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

  const { slug, title, phrase, description, image_url, active, code } = body;

  const { data, error } = await admin
    .from("benefits")
    .insert({
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title,
      phrase,
      description,
      image_url: image_url || "/images/toast_friends.jpg",
      active: active !== undefined ? Boolean(active) : true,
      code,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ benefit: data }, { status: 201 });
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
    .from("benefits")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ benefit: data });
}
