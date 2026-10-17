import { createClient } from "@/lib/supabase/server";
import { getMemberRepository } from "@/lib/members/repository";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Correo inválido")),
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
    return NextResponse.json({ error: "Ingresa un correo válido" }, { status: 422 });
  }

  const { email } = parsed.data;

  // 1. Verify that email belongs to an existing member
  const repo = getMemberRepository();
  const member = await repo.findByEmail(email);

  // If Supabase credentials are configured, send real Supabase Auth OTP
  const supabase = await createClient();
  const origin = req.nextUrl.origin || "https://bacacha.com";

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/mi-membresia`,
      },
    });

    if (error) {
      console.error("Supabase signInWithOtp error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    memberExists: Boolean(member),
    message: "Código o enlace de acceso enviado a tu correo.",
  });
}
