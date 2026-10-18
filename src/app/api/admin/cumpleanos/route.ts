import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    // 1. Fetch all members who have a birth date
    const { data: members, error: mErr } = await supabase
      .from("members")
      .select(`
        id,
        member_number,
        first_name,
        last_name,
        birth_date,
        city,
        phone,
        email,
        membership_level,
        status,
        marketing_consent,
        privacy_consent,
        created_at
      `)
      .not("birth_date", "is", null)
      .neq("status", "BLOCKED");

    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 });
    }

    // 2. Fetch recent birthday communication logs
    const { data: commLogs } = await supabase
      .from("communication_logs")
      .select("id, member_id, created_at, template_slug, channel, message_preview, actor_name")
      .eq("template_slug", "BIRTHDAY_GREETING")
      .order("created_at", { ascending: false });

    const lastGreetingMap: Record<string, any> = {};
    (commLogs || []).forEach((log) => {
      if (!lastGreetingMap[log.member_id]) {
        lastGreetingMap[log.member_id] = log;
      }
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const isLeapYear = (year: number) =>
      (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

    // 3. Process each member's birthday details
    const processedMembers = (members || []).map((m) => {
      const [bYearStr, bMonthStr, bDayStr] = (m.birth_date || "").split("-");
      const bYear = Number(bYearStr);
      let bMonth = Number(bMonthStr);
      let bDay = Number(bDayStr);

      // Handle leap year Feb 29 for non-leap years
      const isFeb29 = bMonth === 2 && bDay === 29;
      let effectiveDay = bDay;
      if (isFeb29 && !isLeapYear(currentYear)) {
        effectiveDay = 28; // celebrated on Feb 28 in non-leap years
      }

      // Calculate turning age
      let turningAge = currentYear - bYear;
      if (
        currentMonth > bMonth ||
        (currentMonth === bMonth && currentDay > effectiveDay)
      ) {
        // already had birthday this calendar year
        turningAge = currentYear - bYear + 1;
      }

      // Calculate days until next birthday
      const thisYearBirthday = new Date(currentYear, bMonth - 1, effectiveDay);
      const todayDateOnly = new Date(currentYear, currentMonth - 1, currentDay);
      let diffMs = thisYearBirthday.getTime() - todayDateOnly.getTime();
      let diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // next year's birthday
        const nextYearBirthday = new Date(currentYear + 1, bMonth - 1, isFeb29 && !isLeapYear(currentYear + 1) ? 28 : bDay);
        diffMs = nextYearBirthday.getTime() - todayDateOnly.getTime();
        diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      }

      const isToday = currentMonth === bMonth && currentDay === effectiveDay;
      const isTomorrow = diffDays === 1;
      const isNext7Days = diffDays >= 0 && diffDays <= 7;
      const isThisMonth = bMonth === currentMonth;

      const lastGreeting = lastGreetingMap[m.id] || null;

      return {
        id: m.id,
        memberNumber: m.member_number,
        firstName: m.first_name,
        lastName: m.last_name,
        birthDate: m.birth_date,
        bMonth,
        bDay,
        effectiveDay,
        isFeb29,
        turningAge,
        city: m.city || "Acapulco",
        phone: m.phone,
        email: m.email,
        membershipLevel: m.membership_level,
        marketingConsent: m.marketing_consent,
        diffDays,
        isToday,
        isTomorrow,
        isNext7Days,
        isThisMonth,
        lastGreeting,
      };
    });

    // Sort by days until birthday ascending
    processedMembers.sort((a, b) => a.diffDays - b.diffDays);

    return NextResponse.json({
      members: processedMembers,
      stats: {
        totalWithBirthDate: processedMembers.length,
        todayCount: processedMembers.filter((m) => m.isToday).length,
        tomorrowCount: processedMembers.filter((m) => m.isTomorrow).length,
        next7DaysCount: processedMembers.filter((m) => m.isNext7Days).length,
        thisMonthCount: processedMembers.filter((m) => m.isThisMonth).length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Log a birthday greeting
export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const { memberId, messagePreview, phone, channel = "WHATSAPP" } = body;

    if (!memberId) {
      return NextResponse.json({ error: "memberId requerido" }, { status: 400 });
    }

    const { data: logEntry, error } = await supabase
      .from("communication_logs")
      .insert({
        member_id: memberId,
        channel,
        template_slug: "BIRTHDAY_GREETING",
        message_preview: messagePreview || "🎂 ¡Feliz cumpleaños de parte de Club Bacachá!",
        phone: phone || null,
        actor_name: session.user.name || "Administrador",
        metadata: {
          timestamp: new Date().toISOString(),
          type: "MANUAL_BIRTHDAY_GREETING",
          operator_verified: true,
        },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAudit(
      "LOG_BIRTHDAY_GREETING",
      { memberId, channel },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "member",
        targetId: memberId,
      }
    );

    return NextResponse.json({ ok: true, log: logEntry });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
