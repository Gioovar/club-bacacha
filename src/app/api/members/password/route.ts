import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const qrToken = String(body?.qrToken || "").trim();
    const newPassword = String(body?.newPassword || "").trim();

    if (!qrToken) {
      return NextResponse.json({ error: "Token de miembro no proporcionado." }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres." },
        { status: 422 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible." }, { status: 500 });
    }

    // 1. Locate member
    const { data: member, error: mErr } = await supabase
      .from("members")
      .select("id, user_id, email, first_name, last_name, member_number")
      .eq("qr_token", qrToken)
      .maybeSingle();

    if (mErr || !member) {
      return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
    }

    // 2. Check if auth user exists
    let authUserId = member.user_id;

    if (!authUserId) {
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === member.email.toLowerCase()
      );
      if (existingUser) {
        authUserId = existingUser.id;
      }
    }

    if (authUserId) {
      // Update existing auth user password
      const { error: updErr } = await supabase.auth.admin.updateUserById(authUserId, {
        password: newPassword,
      });

      if (updErr) {
        return NextResponse.json(
          { error: updErr.message || "Error al actualizar contraseña." },
          { status: 500 }
        );
      }

      await supabase
        .from("members")
        .update({ user_id: authUserId })
        .eq("id", member.id);
    } else {
      // Create auth user with new password
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: member.email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          member_id: member.id,
          member_number: member.member_number,
          first_name: member.first_name,
          last_name: member.last_name,
        },
      });

      if (createErr || !newUser?.user) {
        return NextResponse.json(
          { error: createErr?.message || "Error al crear credencial de acceso." },
          { status: 500 }
        );
      }

      await supabase
        .from("members")
        .update({ user_id: newUser.user.id })
        .eq("id", member.id);
    }

    return NextResponse.json({
      success: true,
      message: "¡Contraseña actualizada correctamente! Ya puedes usarla para entrar al Club.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error al procesar la solicitud." },
      { status: 500 }
    );
  }
}
