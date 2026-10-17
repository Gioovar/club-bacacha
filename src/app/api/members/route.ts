import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { registrationSchema } from "@/lib/members/schema";
import { getMemberRepository } from "@/lib/members/repository";
import { notifyWelcome } from "@/lib/messaging";

/**
 * POST /api/members — register a new member.
 * TODO(Fase 2): rate limiting (IP + phone), bot protection (Turnstile), Supabase.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const result = await getMemberRepository().register(data, {
    userAgent: req.headers.get("user-agent"),
    registeredAt: new Date(),
  });

  if (result.created) {
    after(() =>
      notifyWelcome(result.member, {
        email: data.email,
        phone: data.phone,
        acceptMarketing: data.acceptMarketing,
      }),
    );
  }

  return NextResponse.json(result, { status: result.created ? 201 : 200 });
}
