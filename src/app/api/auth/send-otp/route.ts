import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createAnonClient } from "@supabase/supabase-js";
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
  const rawPassword = typeof body?.password === "string" ? body.password.trim() : "";

  if (!rawIdentifier) {
    return NextResponse.json(
      { error: "Ingresa tu correo electrónico o teléfono registrado." },
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
        .select("id, user_id, member_number, first_name, last_name, city, created_at, membership_level, qr_token, status, email, phone")
        .ilike("email", cleanEmail)
        .maybeSingle();
      memberRow = data;
    }

    if (!memberRow && paddedNumber && digitsOnly.length <= 6) {
      const { data } = await supabase
        .from("members")
        .select("id, user_id, member_number, first_name, last_name, city, created_at, membership_level, qr_token, status, email, phone")
        .eq("member_number", paddedNumber)
        .maybeSingle();
      memberRow = data;
    }

    if (!memberRow && last10Digits.length >= 8) {
      const { data } = await supabase
        .from("members")
        .select("id, user_id, member_number, first_name, last_name, city, created_at, membership_level, qr_token, status, email, phone")
        .ilike("phone", `%${last10Digits}`)
        .limit(1)
        .maybeSingle();
      memberRow = data;
    }

    if (!memberRow) {
      return NextResponse.json(
        {
          error:
            "No encontramos ninguna membresía con ese correo o teléfono. Verifica tus datos o únete al Club Bacachá.",
        },
        { status: 404 }
      );
    }

    // Si el usuario proporcionó contraseña, validamos o configuramos su acceso
    if (rawPassword) {
      if (rawPassword.length < 6) {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 6 caracteres." },
          { status: 400 }
        );
      }

      const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const anon = createAnonClient(anonUrl, anonKey);

      // Intentar iniciar sesión con Supabase Auth
      const { data: signData, error: signError } = await anon.auth.signInWithPassword({
        email: memberRow.email,
        password: rawPassword,
      });

      if (!signError && signData?.user) {
        if (!memberRow.user_id) {
          await supabase
            .from("members")
            .update({ user_id: signData.user.id })
            .eq("id", memberRow.id);
        }
      } else {
        // Si falló el inicio de sesión, verificar si el usuario de auth existe
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const existingAuthUser = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === memberRow.email.toLowerCase()
        );

        if (!existingAuthUser) {
          // El socio existe en Supabase pero aún no tenía cuenta de contraseña en Auth: la creamos con su contraseña elegida
          const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email: memberRow.email,
            password: rawPassword,
            email_confirm: true,
            user_metadata: {
              member_id: memberRow.id,
              member_number: memberRow.member_number,
              first_name: memberRow.first_name,
              last_name: memberRow.last_name,
            },
          });

          if (createErr || !newUser?.user) {
            return NextResponse.json(
              { error: "No se pudo registrar la contraseña. Inténtalo de nuevo." },
              { status: 500 }
            );
          }

          await supabase
            .from("members")
            .update({ user_id: newUser.user.id })
            .eq("id", memberRow.id);
        } else {
          // El usuario ya tiene cuenta en Auth pero la contraseña no coincidió
          return NextResponse.json(
            {
              error:
                "Contraseña incorrecta. Si no la recuerdas o aún no la habías configurado, entra con 'Acceso Rápido sin Contraseña' con tu correo.",
            },
            { status: 401 }
          );
        }
      }
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
