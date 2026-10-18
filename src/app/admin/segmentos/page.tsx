"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Filter, Users, Plus, Bookmark, ArrowRight, Check } from "lucide-react";

export default function AdminSegmentsPage() {
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Segment form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("ALL");
  const [level, setLevel] = useState("ALL");
  const [marketingOnly, setMarketingOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/segments");
      if (res.ok) {
        const json = await res.json();
        setSegments(json.segments || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const handleSaveSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const filters = {
        city: city !== "ALL" ? city : undefined,
        level: level !== "ALL" ? level : undefined,
        marketing_consent: marketingOnly ? true : undefined,
        min_score: minScore > 0 ? minScore : undefined,
      };

      const res = await fetch("/api/admin/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, filters }),
      });

      if (res.ok) {
        setShowForm(false);
        setName("");
        setDescription("");
        fetchSegments();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <Filter className="w-6 h-6 text-amber-400" />
            <span>SEGMENTACIÓN DINÁMICA DE MIEMBROS</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Filtros combinados de fidelización, ubicación, campañas y consentimiento legal
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? "Cerrar Creador" : "Crear Nuevo Segmento"}</span>
        </button>
      </div>

      {/* Segment Creator Card */}
      {showForm && (
        <form
          onSubmit={handleSaveSegment}
          className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4 shadow-2xl"
        >
          <h2 className="text-sm font-semibold text-white font-mono uppercase">
            Definir Condiciones del Segmento
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                Nombre del Segmento
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Acapulco VIP con Consentimiento Activo"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                Descripción Operativa
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Para campaña de invitación a sunset privado"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                Ciudad
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
              >
                <option value="ALL">Todas las ciudades</option>
                <option value="Acapulco">Acapulco</option>
                <option value="CDMX">CDMX</option>
                <option value="Cuernavaca">Cuernavaca</option>
              </select>
            </div>

            <div>
              <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                Nivel de Membresía
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
              >
                <option value="ALL">Todos los niveles</option>
                <option value="MEMBER">MEMBER</option>
                <option value="VIP">VIP</option>
                <option value="FOUNDING_MEMBER">FOUNDING MEMBER</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 text-xs font-mono text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingOnly}
                onChange={(e) => setMarketingOnly(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-900 text-amber-400 focus:ring-0"
              />
              <span>Excluir socios sin consentimiento de marketing (Protección Legal)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-850">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs font-mono disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar Segmento"}
            </button>
          </div>
        </form>
      )}

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs font-mono text-neutral-500">
            Cargando segmentos guardados...
          </div>
        ) : segments.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs font-mono text-neutral-500">
            No hay segmentos guardados aún. Utiliza el botón superior para crear uno.
          </div>
        ) : (
          segments.map((seg) => (
            <div
              key={seg.id}
              className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span className="text-[0.62rem] font-mono text-neutral-500">
                    Por {seg.created_by}
                  </span>
                </div>

                <h3 className="text-base font-serif font-bold text-white uppercase tracking-tight">
                  {seg.name}
                </h3>
                {seg.description && (
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                    {seg.description}
                  </p>
                )}

                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-850 text-[0.68rem] font-mono text-neutral-300 space-y-1">
                  {Object.entries(seg.filters || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-neutral-500 uppercase">{k}:</span>
                      <span>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-850">
                <Link
                  href={`/admin/miembros?city=${seg.filters?.city || "ALL"}&level=${seg.filters?.level || "ALL"}`}
                  className="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-300 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors border border-neutral-800"
                >
                  <span>Ver Miembros del Segmento</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
