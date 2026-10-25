import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ events: [] });
    }

    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching published events:", error);
      return NextResponse.json({ events: [] });
    }

    return NextResponse.json({ events: events || [] });
  } catch (err: unknown) {
    console.error("Unexpected error in /api/events:", err);
    return NextResponse.json({ events: [] });
  }
}
