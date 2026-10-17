import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const status = searchParams.get("status");

  let query = admin
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });

  if (city && city !== "ALL") {
    query = query.eq("city", city);
  }
  if (status && status !== "ALL") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members: data });
}

export async function PATCH(req: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  let body: { id: string; status?: string; membership_level?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 422 });
  }

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.membership_level) updates.membership_level = body.membership_level;

  const { data, error } = await admin
    .from("members")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: data });
}
