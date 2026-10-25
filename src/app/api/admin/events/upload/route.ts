import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    // Validate mime type
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato no válido. Usa JPG, PNG o WebP." },
        { status: 415 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo excede el límite máximo de 10 MB." },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize extension
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `flyers/flyer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("event-flyers")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("event-flyers")
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al procesar flyer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
