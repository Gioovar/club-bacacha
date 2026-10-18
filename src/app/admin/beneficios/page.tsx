"use client";

import { useEffect, useState } from "react";
import {
  Gift,
  Plus,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Tag,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";

export default function AdminBenefitsPage() {
  const [benefits, setBenefits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Redeem modal
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [selectedBenefitId, setSelectedBenefitId] = useState("");
  const [identifierInput, setIdentifierInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // New Benefit modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newBenefit, setNewBenefit] = useState({
    title: "",
    phrase: "",
    description: "",
    requirements: "",
  });
  const [creating, setCreating] = useState(false);

  const fetchBenefits = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/benefits");
      if (res.ok) {
        const json = await res.json();
        setBenefits(json.benefits || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenefits();
  }, []);

  const handlePerformRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBenefitId || !identifierInput.trim()) return;

    setRedeemLoading(true);
    setRedeemResult(null);

    try {
      const input = identifierInput.trim();
      const payload: any = {
        benefitId: selectedBenefitId,
        notes: notesInput.trim() || undefined,
      };

      if (input.startsWith("#") || (!isNaN(Number(input)) && input.length <= 6)) {
        payload.memberNumber = input.replace("#", "");
      } else {
        payload.qrToken = input;
      }

      const res = await fetch("/api/admin/benefits/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRedeemResult({
          success: true,
          message: `Canje exitoso para ${data.member.first_name} ${data.member.last_name} (#${data.member.member_number}) del beneficio: "${data.benefit.title}". Se sumaron +${data.scoreAwarded} puntos de engagement.`,
        });
        setIdentifierInput("");
        setNotesInput("");
      } else {
        setRedeemResult({
          success: false,
          message: data.error || "No se pudo procesar el canje",
        });
      }
    } catch {
      setRedeemResult({
        success: false,
        message: "Error de conexión con el servidor",
      });
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleCreateBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBenefit.title || !newBenefit.phrase) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/benefits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBenefit),
      });
      if (res.ok) {
        setNewModalOpen(false);
        setNewBenefit({ title: "", phrase: "", description: "", requirements: "" });
        fetchBenefits();
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-400" />
            <span>GESTIÓN DE BENEFICIOS & CANJES</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Validación atómica de promociones · Trazabilidad de canjes (+15 pts)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (benefits.length > 0) setSelectedBenefitId(benefits[0].id);
              setRedeemModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono flex items-center gap-2 transition-colors shadow-lg shadow-amber-400/10"
          >
            <Sparkles className="w-4 h-4" />
            <span>Canjear Beneficio a Socio</span>
          </button>

          <button
            onClick={() => setNewModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Beneficio</span>
          </button>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs font-mono text-neutral-500">
            Cargando beneficios oficiales...
          </div>
        ) : benefits.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs font-mono text-neutral-500">
            No hay promociones registradas.
          </div>
        ) : (
          benefits.map((b) => (
            <div
              key={b.id}
              className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4 shadow-xl flex flex-col justify-between hover:border-neutral-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[0.62rem] font-mono uppercase ${
                      b.active
                        ? "bg-emerald-950/70 border border-emerald-500/30 text-emerald-400"
                        : "bg-neutral-850 text-neutral-500"
                    }`}
                  >
                    {b.active ? "ACTIVO" : "INACTIVO"}
                  </span>
                  <span className="text-[0.65rem] font-mono text-neutral-500">
                    +{b.points || 15} pts al canje
                  </span>
                </div>

                <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">
                  {b.title}
                </h3>
                <p className="text-xs text-amber-300/80 font-mono italic">
                  &ldquo;{b.phrase}&rdquo;
                </p>
                {b.description && (
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                    {b.description}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-850 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedBenefitId(b.id);
                    setRedeemModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-amber-300 text-xs font-mono flex items-center gap-1.5 transition-colors border border-neutral-800"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Canjear</span>
                </button>

                <span className="text-[0.65rem] font-mono text-neutral-500">
                  {b.active ? "Disponible para socios" : "Pausado"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Redeem Modal */}
      {redeemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white font-mono uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>CANJEAR BENEFICIO A SOCIO</span>
              </h3>
              <button
                onClick={() => {
                  setRedeemModalOpen(false);
                  setRedeemResult(null);
                }}
                className="text-neutral-500 hover:text-white text-xs font-mono"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handlePerformRedeem} className="space-y-4">
              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Beneficio a Canjear
                </label>
                <select
                  value={selectedBenefitId}
                  onChange={(e) => setSelectedBenefitId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                >
                  {benefits.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Token QR o #Socio
                </label>
                <input
                  type="text"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  placeholder="Escanea el QR o escribe #000001..."
                  autoFocus
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Nota u Observación (Opcional)
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Ej: Mesa VIP 4, botella de cortesía..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                />
              </div>

              {redeemResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                    redeemResult.success
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                      : "bg-red-950/60 border-red-500/40 text-red-300"
                  }`}
                >
                  {redeemResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <span>{redeemResult.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={redeemLoading || !identifierInput.trim()}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {redeemLoading ? "Validando..." : "Confirmar Canje (+15 pts)"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New Benefit Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white font-mono uppercase">
              Crear Nuevo Beneficio Club Bacachá
            </h3>

            <form onSubmit={handleCreateBenefit} className="space-y-3">
              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Título del Beneficio
                </label>
                <input
                  type="text"
                  value={newBenefit.title}
                  onChange={(e) => setNewBenefit({ ...newBenefit, title: e.target.value })}
                  placeholder="Ej: Coctelería de Autor de Bienvenida"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Frase Editorial
                </label>
                <input
                  type="text"
                  value={newBenefit.phrase}
                  onChange={(e) => setNewBenefit({ ...newBenefit, phrase: e.target.value })}
                  placeholder="Ej: Lo que no está en el menú."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Descripción
                </label>
                <textarea
                  value={newBenefit.description}
                  onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
                  rows={2}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-850">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs font-mono"
                >
                  {creating ? "Guardando..." : "Crear Beneficio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
