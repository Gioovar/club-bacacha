import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const origin = req.nextUrl.origin || "https://bacacha.com";
  return NextResponse.redirect(`${origin}/member/verify/${token}`);
}
