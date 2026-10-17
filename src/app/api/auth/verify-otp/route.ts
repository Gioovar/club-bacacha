import { createClient } from "@/lib/supabase/server";
import { getMemberRepository } from "@/lib/members/repository";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  token: z.string().trim().min(6).max(8),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Código o correo inválido" }, { status: 422 });
  }

  const { email, token } = parsed.data;
  const supabase = await createClient();

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      return NextResponse.json({ error: "Código inválido o expirado" }, { status: 401 });
    }

    // Link user_id in members table if not yet linked
    if (data.user) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      if (admin) {
        await admin
          .from("members")
          .update({ user_id: data.user.id })
          .eq("email", email);
      }
    }
  }

  const repo = getMemberRepository();
  const member = await repo.findByEmail(email);

  if (!member) {
    return NextResponse.json({ error: "No se encontró registro para este correo" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    member,
  });
}
