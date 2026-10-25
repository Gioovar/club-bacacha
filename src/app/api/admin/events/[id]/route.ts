import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    // 1. Fetch event
    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (evErr || !event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    // 2. Fetch registrations (reservations) with member details
    const { data: registrations, error: regErr } = await supabase
      .from("event_registrations")
      .select(`
        id,
        social_plan,
        status,
        created_at,
        updated_at,
        members:member_id (
          id,
          member_number,
          first_name,
          last_name,
          email,
          phone,
          status,
          membership_level
        )
      `)
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    // 3. Fetch checkins with member details
    const { data: checkins, error: chkErr } = await supabase
      .from("event_checkins")
      .select(`
        id,
        checkin_at,
        social_plan,
        verified_by_name,
        members:member_id (
          id,
          member_number,
          first_name,
          last_name,
          phone
        )
      `)
      .eq("event_id", id)
      .order("checkin_at", { ascending: false });

    return NextResponse.json({
      event,
      registrations: registrations || [],
      checkins: checkins || [],
      registrationsCount: (registrations || []).length,
      checkinsCount: (checkins || []).length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener detalle del evento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }

    // 1. Get event info
    const { data: event, error: fetchErr } = await supabase
      .from("events")
      .select("id, name, slug, status")
      .eq("id", id)
      .single();

    if (fetchErr || !event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    // 2. Count registrations and checkins
    const { count: regCount } = await supabase
      .from("event_registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id);

    const { count: chkCount } = await supabase
      .from("event_checkins")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id);

    const hasDependencies = (regCount || 0) > 0 || (chkCount || 0) > 0;

    // If there are real attendees/reservations and force is not set, block hard deletion and recommend archive
    if (hasDependencies && !force) {
      return NextResponse.json({
        error: "El evento tiene historial de reservaciones o asistencias registradas. Por seguridad e integridad de los datos, te recomendamos ARCHIVARLO o DESPUBLICARLO para no perder la trazabilidad de los miembros.",
        canArchive: true,
        registrationsCount: regCount || 0,
        checkinsCount: chkCount || 0,
        eventName: event.name,
      }, { status: 409 });
    }

    // If no dependencies or forced by authorized admin
    // Clean up checkins & registrations first if forced
    if (force) {
      await supabase.from("event_checkins").delete().eq("event_id", id);
      await supabase.from("event_registrations").delete().eq("event_id", id);
    }

    const { error: delErr } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // Audit log
    await logAdminAudit(
      "DELETE_EVENT",
      { eventId: id, eventName: event.name, force },
      {
        actorName: session.user.name,
        adminUserId: session.user.id,
        targetType: "event",
        targetId: id,
      }
    );

    return NextResponse.json({
      success: true,
      message: `El evento "${event.name}" fue eliminado permanentemente.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al eliminar evento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
