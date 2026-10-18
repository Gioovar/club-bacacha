import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SOCIAL_PLANS, ageFrom } from "@/lib/members/schema";
import { SITE } from "@/lib/site";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const qrToken = searchParams.get("qrToken");
  const memberNumber = searchParams.get("memberNumber");

  if (!eventId || (!qrToken && !memberNumber)) {
    return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
  }

  // 1. Locate member
  let mQuery = supabase.from("members").select("id, member_number, first_name, last_name, birth_date");
  if (qrToken) {
    mQuery = mQuery.eq("qr_token", qrToken.trim());
  } else if (memberNumber) {
    mQuery = mQuery.eq("member_number", memberNumber.trim().replace(/^#/, ""));
  }

  const { data: member } = await mQuery.maybeSingle();
  if (!member) {
    return NextResponse.json({ registered: false, member: null });
  }

  // 2. Query event registration
  const { data: registration } = await supabase
    .from("event_registrations")
    .select("id, social_plan, status, created_at, updated_at")
    .eq("event_id", eventId)
    .eq("member_id", member.id)
    .maybeSingle();

  return NextResponse.json({
    registered: Boolean(registration),
    registration,
    socialPlan: registration?.social_plan || null,
    hasBirthDate: Boolean(member.birth_date),
    member: {
      id: member.id,
      memberNumber: member.member_number,
      firstName: member.first_name,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const { eventId, qrToken, memberNumber, phone, email, socialPlan, birthDate } = body;

    if (!eventId) {
      return NextResponse.json({ error: "Evento requerido" }, { status: 400 });
    }

    if (!socialPlan || !SOCIAL_PLANS.includes(socialPlan)) {
      return NextResponse.json({ error: "Plan social no válido" }, { status: 422 });
    }

    // 1. Locate member
    let mQuery = supabase.from("members").select("id, member_number, first_name, last_name, birth_date, relationship_status");
    if (qrToken) {
      mQuery = mQuery.eq("qr_token", qrToken.trim());
    } else if (memberNumber) {
      mQuery = mQuery.eq("member_number", memberNumber.trim().replace(/^#/, ""));
    } else if (phone) {
      mQuery = mQuery.eq("phone", phone.trim().replace(/\D/g, ""));
    } else if (email) {
      mQuery = mQuery.eq("email", email.trim().toLowerCase());
    } else {
      return NextResponse.json({ error: "Identificador de miembro requerido" }, { status: 400 });
    }

    const { data: member, error: mErr } = await mQuery.maybeSingle();
    if (mErr || !member) {
      return NextResponse.json({ error: "Socio no encontrado. Por favor afíliate primero." }, { status: 404 });
    }

    // 2. If member has no birth date and provided one, validate and save
    if (!member.birth_date && birthDate) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        const age = ageFrom(birthDate);
        if (age >= SITE.minAge) {
          await supabase.from("members").update({ birth_date: birthDate }).eq("id", member.id);
        }
      }
    }

    // 3. Upsert into event_registrations (Event-specific, does NOT touch member's profile relationship_status!)
    const { data: reg, error: regErr } = await supabase
      .from("event_registrations")
      .upsert({
        event_id: eventId,
        member_id: member.id,
        social_plan: socialPlan,
        status: "CONFIRMED",
        updated_at: new Date().toISOString(),
      }, { onConflict: "event_id,member_id" })
      .select()
      .single();

    if (regErr) {
      return NextResponse.json({ error: regErr.message }, { status: 500 });
    }

    // 4. Log member activity
    await supabase.from("member_activity").insert({
      member_id: member.id,
      activity_type: "EVENT_RSVP",
      metadata: {
        event_id: eventId,
        social_plan: socialPlan,
        source: "WEB_CONFIRMATION",
      },
    });

    return NextResponse.json({
      success: true,
      registration: reg,
      socialPlan: reg.social_plan,
      member: {
        id: member.id,
        memberNumber: member.member_number,
        firstName: member.first_name,
        lastName: member.last_name,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
