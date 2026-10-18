import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ageFrom, RELATIONSHIP_STATUSES } from "@/lib/members/schema";
import { SITE } from "@/lib/site";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qrToken = searchParams.get("qrToken");
  const memberNumber = searchParams.get("memberNumber");
  const email = searchParams.get("email");

  if (!qrToken && !memberNumber && !email) {
    return NextResponse.json({ error: "Identificador de socio requerido" }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
  }

  let query = supabase
    .from("members")
    .select("id, member_number, first_name, last_name, email, phone, city, birth_date, relationship_status, membership_level, qr_token");

  if (qrToken) {
    query = query.eq("qr_token", qrToken.trim());
  } else if (memberNumber) {
    query = query.eq("member_number", memberNumber.trim().replace(/^#/, ""));
  } else if (email) {
    query = query.eq("email", email.trim().toLowerCase());
  }

  const { data: member, error } = await query.maybeSingle();

  if (error || !member) {
    return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    member: {
      id: member.id,
      memberNumber: parseInt(member.member_number, 10),
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      phone: member.phone,
      city: member.city,
      birthDate: member.birth_date,
      relationshipStatus: member.relationship_status || "PREFIERO_NO_DECIR",
      tier: member.membership_level,
      qrToken: member.qr_token,
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const { qrToken, memberNumber, email, birthDate, relationshipStatus } = body;

  if (!qrToken && !memberNumber && !email) {
    return NextResponse.json({ error: "Identificador de socio requerido" }, { status: 400 });
  }

  // 1. Locate member
  let query = supabase.from("members").select("id, birth_date, relationship_status, member_number");
  if (qrToken) {
    query = query.eq("qr_token", qrToken.trim());
  } else if (memberNumber) {
    query = query.eq("member_number", memberNumber.trim().replace(/^#/, ""));
  } else if (email) {
    query = query.eq("email", email.trim().toLowerCase());
  }

  const { data: member, error: findErr } = await query.maybeSingle();
  if (findErr || !member) {
    return NextResponse.json({ error: "Socio no encontrado" }, { status: 404 });
  }

  const updates: Record<string, any> = {};

  // 2. Validate and apply birth date if provided
  if (birthDate !== undefined) {
    if (typeof birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return NextResponse.json({ error: "Formato de fecha inválido (YYYY-MM-DD)" }, { status: 422 });
    }

    const [y, m, d] = birthDate.split("-").map(Number);
    const dateObj = new Date(`${birthDate}T00:00:00`);
    const isValidDate =
      dateObj.getFullYear() === y &&
      dateObj.getMonth() + 1 === m &&
      dateObj.getDate() === d;

    if (!isValidDate) {
      return NextResponse.json({ error: "Fecha no válida en el calendario" }, { status: 422 });
    }

    const now = new Date();
    if (dateObj > now) {
      return NextResponse.json({ error: "No se permiten fechas futuras" }, { status: 422 });
    }

    const age = ageFrom(birthDate);
    if (age < SITE.minAge) {
      return NextResponse.json({ error: `Debes ser mayor de ${SITE.minAge} años` }, { status: 422 });
    }

    updates.birth_date = birthDate;
  }

  // 3. Validate and apply relationship status if provided
  if (relationshipStatus !== undefined) {
    if (!RELATIONSHIP_STATUSES.includes(relationshipStatus)) {
      return NextResponse.json({ error: "Situación sentimental no válida" }, { status: 422 });
    }
    updates.relationship_status = relationshipStatus;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "No se enviaron campos para actualizar" }, { status: 200 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("members")
    .update(updates)
    .eq("id", member.id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Log activity
  await supabase.from("member_activity").insert({
    member_id: member.id,
    activity_type: "PROFILE_UPDATED",
    metadata: updates,
  });

  return NextResponse.json({
    ok: true,
    birthDate: updated.birth_date,
    relationshipStatus: updated.relationship_status,
  });
}
