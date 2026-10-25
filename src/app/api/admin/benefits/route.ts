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
  const typeFilter = searchParams.get("type");
  const searchQuery = searchParams.get("search")?.toLowerCase().trim();

  let query = admin
    .from("benefits")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: benefits, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch real redemptions counts from member_benefits
  const { data: allRedemptions } = await admin
    .from("member_benefits")
    .select("benefit_id, id");

  // Fetch events to associate names if event_id is present
  const { data: allEvents } = await admin
    .from("events")
    .select("id, name, event_date, status");

  const redemptionsMap = new Map<string, number>();
  (allRedemptions || []).forEach((r) => {
    redemptionsMap.set(r.benefit_id, (redemptionsMap.get(r.benefit_id) || 0) + 1);
  });

  const eventsMap = new Map<string, any>();
  (allEvents || []).forEach((e) => {
    eventsMap.set(e.id, e);
  });

  let enrichedBenefits = (benefits || []).map((b) => {
    let parsedReqs: any = {};
    if (b.requirements && typeof b.requirements === "string") {
      try {
        if (b.requirements.startsWith("{")) {
          parsedReqs = JSON.parse(b.requirements);
        }
      } catch {
        parsedReqs = { text: b.requirements };
      }
    }

    const benefitType =
      b.benefit_type ||
      parsedReqs.benefit_type ||
      (b.title.toLowerCase().includes("playera") || b.title.toLowerCase().includes("recompensa")
        ? "POINTS_REWARD"
        : b.title.toLowerCase().includes("mojito") || b.title.toLowerCase().includes("botella")
        ? "EVENT_PROMO"
        : b.title.toLowerCase().includes("cumpleaños")
        ? "BIRTHDAY_BENEFIT"
        : "MEMBER_PROMO");

    const eventId = b.event_id || parsedReqs.event_id || null;
    const associatedEvent = eventId ? eventsMap.get(eventId) : null;

    const pointsCost =
      b.points_cost !== undefined && b.points_cost !== null
        ? b.points_cost
        : parsedReqs.points_cost !== undefined
        ? parsedReqs.points_cost
        : benefitType === "POINTS_REWARD"
        ? 150
        : 0;

    const pointsAward =
      b.points_award !== undefined && b.points_award !== null
        ? b.points_award
        : parsedReqs.points_award || 0;

    const status =
      b.status ||
      (b.active ? "published" : "draft");

    const venue =
      b.venue ||
      parsedReqs.venue ||
      "Costera Miguel Alemán · Acapulco";

    const terms =
      b.terms ||
      parsedReqs.terms ||
      parsedReqs.text ||
      "";

    const stock =
      b.stock !== undefined && b.stock !== null
        ? b.stock
        : parsedReqs.stock !== undefined
        ? parsedReqs.stock
        : null;

    const maxPerMember =
      b.max_redemptions_per_member !== undefined
        ? b.max_redemptions_per_member
        : parsedReqs.max_per_member !== undefined
        ? parsedReqs.max_per_member
        : 1;

    const redemptionsCount = redemptionsMap.get(b.id) || 0;

    return {
      ...b,
      benefit_type: benefitType,
      status,
      event_id: eventId,
      associated_event: associatedEvent,
      points_cost: pointsCost,
      points_award: pointsAward,
      venue,
      terms,
      stock,
      max_redemptions_per_member: maxPerMember,
      redemptions_count: redemptionsCount,
      metadata: b.metadata || parsedReqs,
    };
  });

  // Filter by status if provided
  if (statusFilter && statusFilter !== "all") {
    enrichedBenefits = enrichedBenefits.filter((b) => b.status === statusFilter);
  }

  // Filter by type if provided
  if (typeFilter && typeFilter !== "all") {
    enrichedBenefits = enrichedBenefits.filter((b) => b.benefit_type === typeFilter);
  }

  // Filter by search query
  if (searchQuery) {
    enrichedBenefits = enrichedBenefits.filter(
      (b) =>
        b.title?.toLowerCase().includes(searchQuery) ||
        b.phrase?.toLowerCase().includes(searchQuery) ||
        b.description?.toLowerCase().includes(searchQuery) ||
        b.venue?.toLowerCase().includes(searchQuery)
    );
  }

  const metrics = {
    totalCount: (benefits || []).length,
    publishedCount: (benefits || []).filter((b) => b.active).length,
    totalRedemptions: (allRedemptions || []).length,
    rewardsCount: enrichedBenefits.filter((b) => b.benefit_type === "POINTS_REWARD").length,
  };

  return NextResponse.json({
    benefits: enrichedBenefits,
    metrics,
  });
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

  // Handle Duplication
  if (body.action === "duplicate" && body.sourceBenefitId) {
    const { data: source, error: srcErr } = await admin
      .from("benefits")
      .select("*")
      .eq("id", body.sourceBenefitId)
      .single();

    if (srcErr || !source) {
      return NextResponse.json({ error: "Beneficio origen no encontrado" }, { status: 404 });
    }

    const uniqueSuffix = Date.now().toString(36).slice(-4);
    const newSlug = `${source.slug}-copia-${uniqueSuffix}`;
    const newTitle = `${source.title} (Copia)`;

    const duplicateData: any = {
      slug: newSlug,
      title: newTitle,
      phrase: source.phrase,
      description: source.description,
      image_url: source.image_url,
      active: false,
      starts_at: source.starts_at,
      ends_at: source.ends_at,
      requirements: source.requirements,
      code: source.code ? `${source.code}_COP` : null,
    };

    const { data: cloned, error: cloneErr } = await admin
      .from("benefits")
      .insert(duplicateData)
      .select()
      .single();

    if (cloneErr) {
      return NextResponse.json({ error: cloneErr.message }, { status: 500 });
    }

    await logAdminAudit(
      "BENEFIT_DUPLICATED",
      { originalId: source.id, newTitle },
      {
        adminUserId: session.user.id,
        actorName: session.user.name || session.user.username,
        targetType: "benefits",
        targetId: cloned.id,
      }
    );

    return NextResponse.json({ success: true, benefit: cloned }, { status: 201 });
  }

  // Normal Benefit Creation
  const {
    title,
    phrase,
    description,
    image_url,
    benefit_type = "MEMBER_PROMO",
    event_id = null,
    points_cost = 0,
    points_award = 0,
    venue = "Costera Miguel Alemán · Acapulco",
    terms = "",
    starts_at = null,
    ends_at = null,
    max_redemptions_total = null,
    max_redemptions_per_member = 1,
    stock = null,
    status = "draft",
    code = null,
    metadata = {},
  } = body;

  if (!title || !phrase) {
    return NextResponse.json({ error: "Título y frase requeridos" }, { status: 422 });
  }

  const generatedSlug = (body.slug || title)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") + `-${Date.now().toString(36).slice(-4)}`;

  const isPublished = status === "published";

  // Serialized metadata fallback for requirements field
  const packedRequirements = JSON.stringify({
    benefit_type,
    event_id,
    points_cost: Number(points_cost) || 0,
    points_award: Number(points_award) || 0,
    venue,
    terms,
    max_redemptions_total: max_redemptions_total ? Number(max_redemptions_total) : null,
    max_per_member: max_redemptions_per_member ? Number(max_redemptions_per_member) : 1,
    stock: stock ? Number(stock) : null,
    ...metadata,
  });

  const insertDataWithExtensions: any = {
    slug: generatedSlug,
    title: title.trim(),
    phrase: phrase.trim(),
    description: description?.trim() || null,
    image_url: image_url || "/images/gran_inauguracion.png",
    active: isPublished,
    status,
    benefit_type,
    event_id: event_id || null,
    points_cost: Number(points_cost) || 0,
    points_award: Number(points_award) || 0,
    venue,
    terms,
    starts_at: starts_at || null,
    ends_at: ends_at || null,
    max_redemptions_total: max_redemptions_total ? Number(max_redemptions_total) : null,
    max_redemptions_per_member: max_redemptions_per_member ? Number(max_redemptions_per_member) : 1,
    stock: stock ? Number(stock) : null,
    requirements: packedRequirements,
    code: code || null,
    metadata,
  };

  // Try inserting with all fields
  let { data: newBenefit, error: insertErr } = await admin
    .from("benefits")
    .insert(insertDataWithExtensions)
    .select()
    .single();

  if (insertErr) {
    // Fall back to core columns if migration not yet applied
    console.warn("Fallback to core benefits columns:", insertErr.message);
    const coreData: any = {
      slug: generatedSlug,
      title: title.trim(),
      phrase: phrase.trim(),
      description: description?.trim() || null,
      image_url: image_url || "/images/gran_inauguracion.png",
      active: isPublished,
      starts_at: starts_at || null,
      ends_at: ends_at || null,
      requirements: packedRequirements,
      code: code || null,
    };

    const retry = await admin
      .from("benefits")
      .insert(coreData)
      .select()
      .single();

    if (retry.error) {
      return NextResponse.json({ error: retry.error.message }, { status: 500 });
    }
    newBenefit = retry.data;
  }

  await logAdminAudit(
    "BENEFIT_CREATED",
    { title, benefit_type, status },
    {
      adminUserId: session.user.id,
      actorName: session.user.name || session.user.username,
      targetType: "benefits",
      targetId: newBenefit.id,
    }
  );

  return NextResponse.json({ success: true, benefit: newBenefit }, { status: 201 });
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
    return NextResponse.json({ error: "ID requerido" }, { status: 422 });
  }

  let patchData: any = { ...updates, updated_at: new Date().toISOString() };

  // Quick state actions
  if (action === "publish") {
    patchData = { active: true, status: "published", updated_at: new Date().toISOString() };
  } else if (action === "unpublish") {
    patchData = { active: false, status: "draft", updated_at: new Date().toISOString() };
  } else if (action === "archive") {
    patchData = { active: false, status: "archived", updated_at: new Date().toISOString() };
  } else if (updates.status) {
    patchData.active = updates.status === "published";
  }

  // Update packed requirements if relevant fields are passed
  if (
    updates.benefit_type ||
    updates.event_id !== undefined ||
    updates.points_cost !== undefined ||
    updates.terms !== undefined ||
    updates.venue !== undefined
  ) {
    const { data: existing } = await admin.from("benefits").select("requirements").eq("id", id).single();
    let currentReqs = {};
    try {
      if (existing?.requirements?.startsWith("{")) {
        currentReqs = JSON.parse(existing.requirements);
      }
    } catch {}

    patchData.requirements = JSON.stringify({
      ...currentReqs,
      ...(updates.benefit_type ? { benefit_type: updates.benefit_type } : {}),
      ...(updates.event_id !== undefined ? { event_id: updates.event_id } : {}),
      ...(updates.points_cost !== undefined ? { points_cost: Number(updates.points_cost) } : {}),
      ...(updates.points_award !== undefined ? { points_award: Number(updates.points_award) } : {}),
      ...(updates.venue ? { venue: updates.venue } : {}),
      ...(updates.terms ? { terms: updates.terms } : {}),
      ...(updates.stock !== undefined ? { stock: updates.stock } : {}),
      ...(updates.max_redemptions_per_member !== undefined ? { max_per_member: updates.max_redemptions_per_member } : {}),
    });
  }

  // Try updating with all fields
  let { data: updated, error: updateErr } = await admin
    .from("benefits")
    .update(patchData)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    // Fall back to updating only core columns if schema extension is not yet applied
    console.warn("Fallback to core benefits patch:", updateErr.message);
    const corePatch: any = {
      updated_at: new Date().toISOString(),
    };
    if (patchData.active !== undefined) corePatch.active = patchData.active;
    if (patchData.title) corePatch.title = patchData.title;
    if (patchData.phrase) corePatch.phrase = patchData.phrase;
    if (patchData.description !== undefined) corePatch.description = patchData.description;
    if (patchData.image_url) corePatch.image_url = patchData.image_url;
    if (patchData.requirements) corePatch.requirements = patchData.requirements;
    if (patchData.starts_at !== undefined) corePatch.starts_at = patchData.starts_at;
    if (patchData.ends_at !== undefined) corePatch.ends_at = patchData.ends_at;

    const retry = await admin
      .from("benefits")
      .update(corePatch)
      .eq("id", id)
      .select()
      .single();

    if (retry.error) {
      return NextResponse.json({ error: retry.error.message }, { status: 500 });
    }
    updated = retry.data;
  }

  await logAdminAudit(
    action ? `BENEFIT_${action.toUpperCase()}` : "BENEFIT_UPDATED",
    { action, fields: Object.keys(updates) },
    {
      adminUserId: session.user.id,
      actorName: session.user.name || session.user.username,
      targetType: "benefits",
      targetId: id,
    }
  );

  return NextResponse.json({ success: true, benefit: updated });
}
