import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession, logAdminAudit } from "@/lib/admin/session";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const searchQuery = searchParams.get("search")?.toLowerCase().trim();

  let query = admin
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: events, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch checkins and registrations with social plans
  const { data: allCheckins } = await admin
    .from("event_checkins")
    .select("event_id, social_plan");

  const { data: allRegistrations } = await admin
    .from("event_registrations")
    .select("event_id, social_plan, status");

  let enrichedEvents = (events || []).map((evt) => {
    const checkins = (allCheckins || []).filter((c) => c.event_id === evt.id);
    const regs = (allRegistrations || []).filter((r) => r.event_id === evt.id && r.status !== "CANCELLED");

    const planCounts: Record<string, number> = {
      PLAN_LIGUE: 0,
      HACER_AMIGOS: 0,
      EN_PAREJA: 0,
      SOLO_DIVERTIRME: 0,
      SIN_ETIQUETA: 0,
    };

    // Priority to checkins, fallback to registrations
    const combinedPlans = [
      ...regs.map((r) => r.social_plan),
      ...checkins.map((c) => c.social_plan),
    ];

    combinedPlans.forEach((p) => {
      if (p && planCounts[p] !== undefined) {
        planCounts[p]++;
      } else if (p) {
        planCounts.SIN_ETIQUETA++;
      }
    });

    const capacity = evt.capacity || null;
    const availableSlots = capacity ? Math.max(0, capacity - regs.length) : null;

    return {
      ...evt,
      checkinsCount: checkins.length,
      registrationsCount: regs.length,
      availableSlots,
      socialPlans: planCounts,
    };
  });

  if (searchQuery) {
    enrichedEvents = enrichedEvents.filter(
      (e) =>
        e.name?.toLowerCase().includes(searchQuery) ||
        e.venue?.toLowerCase().includes(searchQuery) ||
        e.city?.toLowerCase().includes(searchQuery)
    );
  }

  return NextResponse.json({ events: enrichedEvents });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Check if duplicate action requested
  if (body.action === "duplicate" && body.sourceEventId) {
    const { data: sourceEvent, error: srcErr } = await admin
      .from("events")
      .select("*")
      .eq("id", body.sourceEventId)
      .single();

    if (srcErr || !sourceEvent) {
      return NextResponse.json({ error: "Evento de origen no encontrado" }, { status: 404 });
    }

    const newSlug = `${sourceEvent.slug}-copia-${Date.now().toString(36)}`;
    const duplicateData = {
      slug: newSlug,
      name: `(Copia) ${sourceEvent.name}`,
      description: sourceEvent.description,
      image_url: sourceEvent.image_url,
      venue: sourceEvent.venue,
      city: sourceEvent.city || "Acapulco",
      event_date: sourceEvent.event_date,
      event_time: sourceEvent.event_time,
      status: "draft", // Always draft for duplicate
      members_only: sourceEvent.members_only,
    };

    const { data: duplicated, error: dupErr } = await admin
      .from("events")
      .insert(duplicateData)
      .select()
      .single();

    if (dupErr) {
      return NextResponse.json({ error: dupErr.message }, { status: 500 });
    }

    await logAdminAudit(
      "DUPLICATE_EVENT",
      { sourceEventId: body.sourceEventId, newEventId: duplicated.id },
      { actorName: session.user.name, adminUserId: session.user.id, targetType: "event", targetId: duplicated.id }
    );

    return NextResponse.json({ event: duplicated }, { status: 201 });
  }

  const {
    name,
    slug,
    description,
    short_description,
    image_url,
    venue,
    city,
    event_date,
    event_time,
    end_time,
    address,
    directions,
    status,
    members_only,
    capacity,
    is_free,
    ticket_price,
    has_rsvp,
    rsvp_status,
    social_dynamic,
    points_award,
  } = body;

  if (!name || !venue || !event_date) {
    return NextResponse.json(
      { error: "Nombre, lugar y fecha son campos obligatorios" },
      { status: 422 }
    );
  }

  const generatedSlug = (slug || name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Base payload with guaranteed columns
  const basePayload: Record<string, any> = {
    slug: `${generatedSlug}-${Date.now().toString(36)}`,
    name,
    description: description || name,
    image_url: image_url || "/images/woman_dancing.jpg",
    venue,
    city: city || "Acapulco",
    event_date,
    event_time: event_time || "22:00",
    status: status || "draft",
    members_only: Boolean(members_only),
  };

  // Optional extended columns (attempt with full payload first)
  const fullPayload = {
    ...basePayload,
    ...(short_description ? { short_description } : {}),
    ...(end_time ? { end_time } : {}),
    ...(address ? { address } : {}),
    ...(directions ? { directions } : {}),
    ...(capacity ? { capacity: Number(capacity) } : {}),
    is_free: is_free !== undefined ? Boolean(is_free) : true,
    ticket_price: ticket_price ? Number(ticket_price) : 0,
    has_rsvp: has_rsvp !== undefined ? Boolean(has_rsvp) : true,
    rsvp_status: rsvp_status || "open",
    social_dynamic: social_dynamic || "SEMAFORO",
    points_award: points_award ? Number(points_award) : 20,
  };

  let insertedEvent;
  let insertErr;

  // Try insert with full payload
  const result = await admin
    .from("events")
    .insert(fullPayload)
    .select()
    .single();

  insertedEvent = result.data;
  insertErr = result.error;

  // If column error occurs (e.g. migration not applied yet), fallback to basePayload
  if (insertErr && insertErr.message.includes("column")) {
    const fallbackResult = await admin
      .from("events")
      .insert(basePayload)
      .select()
      .single();
    insertedEvent = fallbackResult.data;
    insertErr = fallbackResult.error;
  }

  if (insertErr || !insertedEvent) {
    return NextResponse.json({ error: insertErr?.message || "Error al crear evento" }, { status: 500 });
  }

  await logAdminAudit(
    "CREATE_EVENT",
    { eventName: name, eventId: insertedEvent.id, status: insertedEvent.status },
    { actorName: session.user.name, adminUserId: session.user.id, targetType: "event", targetId: insertedEvent.id }
  );

  return NextResponse.json({ event: insertedEvent }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { id, action, ...updates } = body;
  if (!id) {
    return NextResponse.json({ error: "ID de evento requerido" }, { status: 422 });
  }

  // Quick actions
  if (action === "publish") {
    updates.status = "published";
  } else if (action === "unpublish") {
    updates.status = "draft";
  } else if (action === "archive") {
    updates.status = "archived";
  }

  // Clean numerical fields if present
  if (updates.capacity !== undefined) {
    updates.capacity = updates.capacity ? Number(updates.capacity) : null;
  }
  if (updates.ticket_price !== undefined) {
    updates.ticket_price = updates.ticket_price ? Number(updates.ticket_price) : 0;
  }

  let updatedEvent;
  let updateErr;

  // Try update with all provided fields
  const res = await admin
    .from("events")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  updatedEvent = res.data;
  updateErr = res.error;

  // If column error occurs, strip extended columns and update core fields
  if (updateErr && updateErr.message.includes("column")) {
    const coreKeys = [
      "name",
      "slug",
      "description",
      "image_url",
      "venue",
      "city",
      "event_date",
      "event_time",
      "status",
      "members_only",
      "reserve_url",
      "external_url",
      "updated_at",
    ];
    const coreUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const k of coreKeys) {
      if (updates[k] !== undefined) coreUpdates[k] = updates[k];
    }
    const fallbackRes = await admin
      .from("events")
      .update(coreUpdates)
      .eq("id", id)
      .select()
      .single();
    updatedEvent = fallbackRes.data;
    updateErr = fallbackRes.error;
  }

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await logAdminAudit(
    "UPDATE_EVENT",
    { eventId: id, updates: Object.keys(updates) },
    { actorName: session.user.name, adminUserId: session.user.id, targetType: "event", targetId: id }
  );

  return NextResponse.json({ event: updatedEvent });
}
