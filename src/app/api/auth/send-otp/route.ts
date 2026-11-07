import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberRepository } from "@/lib/members/repository";
import type { MemberStatus, MemberTier, PublicMember } from "@/lib/members/types";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const rawIdentifier = String(body?.identifier || body?.email || "").trim();
  if (!rawIdentifier) {
    return NextResponse.json(
      { error: "Ingresa tu correo electrónico, teléfono o número de socio." },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();
  if (supabase) {
    const cleanEmail = rawIdentifier.toLowerCase();
    const digitsOnly = rawIdentifier.replace(/\D/g, "");
    const last10Digits = digitsOnly.slice(-10);
    const paddedNumber = digitsOnly ? digitsOnly.padStart(6, "0") : "";

    let memberRow: any = null;

    if (cleanEmail.includes("@")) {
      const { data } = await supabase
        .from("members")
        .select("member_number, first_name, last_name, city, created_at, membership_level, qr_token, status")
        .ilike("email", cleanEmail)
        .maybeSingle();
      memberRow = data;
    }

    if (!memberRow && paddedNumber && digitsOnly.length <= 6) {
      const { data } = await supabase
        .from("members")
        .select("member_number, first_name, last_name, city, created_at, membership_level, qr_token, status")
        .eq("member_number", paddedNumber)
        .maybeSingle();
      memberRow = data;
    }

    if (!memberRow && last10Digits.length >= 8) {
      const { data } = await supabase
        .from("members")
        .select("member_number, first_name, last_name, city, created_at, membership_level, qr_token, status, phone")
        .ilike("phone", `%${last10Digits}`)
        .limit(1)
        .maybeSingle();
      memberRow = data;
    }

    if (!memberRow) {
      return NextResponse.json(
        {
          error:
            "No encontramos una membresía con ese dato. Verifica tu correo, teléfono o número de socio (#000001).",
        },
        { status: 404 }
      );
    }

    const member: PublicMember = {
      memberNumber: parseInt(memberRow.member_number, 10),
      firstName: memberRow.first_name,
      lastName: memberRow.last_name,
      city: memberRow.city,
      since: new Date(memberRow.created_at).getFullYear(),
      tier: memberRow.membership_level as MemberTier,
      status: memberRow.status as MemberStatus,
      qrToken: memberRow.qr_token,
    };

    return NextResponse.json({
      ok: true,
      directLogin: true,
      memberExists: true,
      member,
    });
  }

  // Fallback to repository
  const repo = getMemberRepository();
  const member = await repo.findByEmail(rawIdentifier.toLowerCase());
  if (!member) {
    return NextResponse.json(
      { error: "No encontramos una membresía registrada con ese correo." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    directLogin: true,
    memberExists: true,
    member,
  });
}
