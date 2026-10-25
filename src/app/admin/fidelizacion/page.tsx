"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  Sparkles,
  Users,
  Share2,
  Calendar,
  Gift,
  AlertCircle,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
} from "lucide-react";

export default function LoyaltyPage() {
  const [activeTab, setActiveTab] = useState<"crm" | "points" | "rewards" | "redemptions">("crm");

  // CRM Tab State
  const [timeframe, setTimeframe] = useState<"30d" | "60d" | "90d" | "all">("all");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Points Assignment State
  const [pointsMembers, setPointsMembers] = useState<any[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [searchMember, setSearchMember] = useState("");
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [pointsAmount, setPointsAmount] = useState<number>(50);
  const [pointsType, setPointsType] = useState<string>("EVENT_ATTENDANCE");
  const [pointsReason, setPointsReason] = useState("");
  const [submittingPoints, setSubmittingPoints] = useState(false);
  const [pointsFeedback, setPointsFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  // Rewards Catalog & Redemptions State
  const [rewards, setRewards] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [searchRedemption, setSearchRedemption] = useState("");

  // New Reward Form
  const [showNewRewardModal, setShowNewRewardModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCost, setNewCost] = useState(100);
  const [newCategory, setNewCategory] = useState("MERCHANDISE");
  const [newStock, setNewStock] = useState(30);
  const [newTerms, setNewTerms] = useState("");
  const [savingReward, setSavingReward] = useState(false);

  // Fulfilling Redemption State
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  // Fetch CRM Metrics
  const fetchLoyalty = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/loyalty?timeframe=${timeframe}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Points Members
  const fetchPointsMembers = async () => {
    setLoadingPoints(true);
    try {
      const res = await fetch("/api/admin/loyalty/points");
      if (res.ok) {
        const json = await res.json();
        setPointsMembers(json.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPoints(false);
    }
  };

  // Fetch Rewards & Redemptions
  const fetchRewardsAndRedemptions = async () => {
    setLoadingRewards(true);
    try {
      const res = await fetch("/api/admin/loyalty/rewards");
      if (res.ok) {
        const json = await res.json();
        setRewards(json.rewards || []);
        setRedemptions(json.redemptions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRewards(false);
    }
  };

  useEffect(() => {
    fetchLoyalty();
  }, [timeframe]);

  useEffect(() => {
    if (activeTab === "points") {
      fetchPointsMembers();
    } else if (activeTab === "rewards" || activeTab === "redemptions") {
      fetchRewardsAndRedemptions();
    }
  }, [activeTab]);

  // Handle Manual Points Assignment
  const handleAssignPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !pointsReason.trim() || pointsAmount === 0) return;

    setSubmittingPoints(true);
    setPointsFeedback(null);

    try {
      const res = await fetch("/api/admin/loyalty/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          amount: pointsAmount,
          type: pointsType,
          reason: pointsReason.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPointsFeedback({
          text: `✓ Asignados ${pointsAmount > 0 ? `+${pointsAmount}` : pointsAmount} pts a ${selectedMember.fullName}. Nuevo saldo: ${json.newBalance} pts.`,
        });
        setPointsReason("");
        fetchPointsMembers();
      } else {
        setPointsFeedback({ text: json.error || "No se pudo ajustar los puntos", error: true });
      }
    } catch {
      setPointsFeedback({ text: "Error de conexión al procesar el ajuste", error: true });
    } finally {
      setSubmittingPoints(false);
    }
  };

  // Handle New Reward Creation
  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || newCost <= 0) return;

    setSavingReward(true);
    try {
      const res = await fetch("/api/admin/loyalty/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          pointsCost: newCost,
          category: newCategory,
          stock: newStock,
          terms: newTerms.trim(),
        }),
      });

      if (res.ok) {
        setShowNewRewardModal(false);
        setNewTitle("");
        setNewDesc("");
        setNewCost(100);
        setNewTerms("");
        fetchRewardsAndRedemptions();
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear premio");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setSavingReward(false);
    }
  };

  // Handle Fulfilling a Redemption (Validar y Entregar)
  const handleFulfillRedemption = async (redemptionId: string) => {
    if (!confirm("¿Confirmas la entrega de este premio al socio?")) return;

    setFulfillingId(redemptionId);
    try {
      const res = await fetch("/api/admin/loyalty/rewards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redemptionId,
          status: "FULFILLED",
          notes: "Entregado y validado en barra/recepción",
        }),
      });

      if (res.ok) {
        fetchRewardsAndRedemptions();
      } else {
        const err = await res.json();
        alert(err.error || "Error al validar entrega");
      }
    } catch {
      alert("Error de conexión al validar entrega");
    } finally {
      setFulfillingId(null);
    }
  };

  // Filtered lists
  const filteredPointsMembers = pointsMembers.filter((m) => {
    const q = searchMember.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.memberNumber.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  const filteredRedemptions = redemptions.filter((r) => {
    const q = searchRedemption.toLowerCase();
    return (
      r.redemptionCode.toLowerCase().includes(q) ||
      r.rewardTitle.toLowerCase().includes(q) ||
      (r.member?.name && r.member.name.toLowerCase().includes(q)) ||
      (r.member?.memberNumber && r.member.memberNumber.includes(q))
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            <span>SISTEMA DE FIDELIZACIÓN & PUNTOS BACACHÁ</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Gestión transaccional de puntos, catálogo de recompensas oficiales y analítica CRM
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-950 border border-neutral-800 overflow-x-auto no-scrollbar">
          {[
            { id: "crm", label: "🏆 Métricas CRM" },
            { id: "points", label: "⭐ Asignar Puntos" },
            { id: "rewards", label: "🎁 Catálogo de Premios" },
            { id: "redemptions", label: "🎟️ Canjes & Entregas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-amber-400 text-black font-semibold shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          TAB 1: CRM & ENGAGEMENT METRICS (EXISTING)
          ========================================================================= */}
      {activeTab === "crm" && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-neutral-400">
              Período de análisis:
            </span>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-800">
              {(["30d", "60d", "90d", "all"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
                    timeframe === t
                      ? "bg-amber-400 text-black font-semibold shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {t === "all" ? "Histórico" : `${t.replace("d", "")} Días`}
                </button>
              ))}
            </div>
          </div>

          {/* Operational Suggestions */}
          {data?.suggestions && data.suggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>SUGERENCIAS OPERATIVAS DE FIDELIZACIÓN</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.suggestions.map((sug: any) => (
                  <div
                    key={sug.id}
                    className="p-5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-3 hover:border-amber-400/40 transition-colors shadow-lg flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[0.62rem] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 font-semibold">
                          {sug.type}
                        </span>
                        <span className="text-[0.68rem] font-mono text-neutral-400">{sug.memberName}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white font-mono">{sug.title}</h3>
                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">{sug.reason}</p>
                    </div>

                    <Link
                      href={sug.actionHref}
                      className="mt-2 inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-xs font-mono text-amber-300 transition-colors border border-neutral-800"
                    >
                      <span>{sug.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ranking Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TOP ACTIVOS */}
            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white uppercase font-mono tracking-wide">
                    TOP MIEMBROS MÁS ACTIVOS
                  </h2>
                </div>
                <span className="text-[0.68rem] font-mono text-neutral-400">Score de Participación</span>
              </div>

              <div className="space-y-2 pt-1">
                {(!data?.topActive || data.topActive.length === 0) ? (
                  <p className="text-xs font-mono text-neutral-500 py-6 text-center">
                    Sin datos suficientes para este período
                  </p>
                ) : (
                  data.topActive.map((m: any, idx: number) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-bold text-amber-400 font-serif">
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <Link
                            href={`/admin/miembros/${m.id}`}
                            className="font-medium text-white hover:text-amber-300 transition-colors"
                          >
                            {m.name}
                          </Link>
                          <span className="text-[0.65rem] text-neutral-400">
                            #{m.member_number} · {m.city} · {m.membership_level}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-bold text-amber-400 block font-mono">
                          {m.score} pts
                        </span>
                        <span className="text-[0.62rem] text-neutral-400">
                          {m.category.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TOP REFERIDORES */}
            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white uppercase font-mono tracking-wide">
                    TOP EMBAJADORES Y REFERIDORES
                  </h2>
                </div>
                <span className="text-[0.68rem] font-mono text-neutral-400">Referidos Confirmados</span>
              </div>

              <div className="space-y-2 pt-1">
                {(!data?.topReferrers || data.topReferrers.length === 0) ? (
                  <p className="text-xs font-mono text-neutral-500 py-6 text-center">
                    Aún no hay miembros con referidos confirmados en este período
                  </p>
                ) : (
                  data.topReferrers.map((m: any, idx: number) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-bold text-emerald-400 font-serif">
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <Link
                            href={`/admin/miembros/${m.id}`}
                            className="font-medium text-white hover:text-amber-300"
                          >
                            {m.name}
                          </Link>
                          <span className="text-[0.65rem] text-neutral-400">
                            #{m.member_number} · {m.city}
                          </span>
                        </div>
                      </div>

                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {m.referrals_confirmed} amigos
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TOP ASISTENCIAS A EVENTOS */}
            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <h2 className="text-sm font-semibold text-white uppercase font-mono tracking-wide">
                    TOP ASISTENTES A EVENTOS
                  </h2>
                </div>
                <span className="text-[0.68rem] font-mono text-neutral-400">Check-ins Validados</span>
              </div>

              <div className="space-y-2 pt-1">
                {(!data?.topAttendees || data.topAttendees.length === 0) ? (
                  <p className="text-xs font-mono text-neutral-500 py-6 text-center">
                    Sin asistencias a eventos registradas todavía
                  </p>
                ) : (
                  data.topAttendees.map((m: any, idx: number) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-bold text-purple-400 font-serif">
                          #{idx + 1}
                        </span>
                        <Link
                          href={`/admin/miembros/${m.id}`}
                          className="font-medium text-white hover:text-amber-300"
                        >
                          {m.name}
                        </Link>
                      </div>
                      <span className="text-sm font-bold text-purple-400 font-mono">
                        {m.events_attended} asistencias
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* MIEMBROS POR REACTIVAR */}
            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white uppercase font-mono tracking-wide">
                    MIEMBROS POR REACTIVAR
                  </h2>
                </div>
                <span className="text-[0.68rem] font-mono text-neutral-400">&gt; 30 días sin actividad</span>
              </div>

              <div className="space-y-2 pt-1">
                {(!data?.toReactivate || data.toReactivate.length === 0) ? (
                  <p className="text-xs font-mono text-neutral-500 py-6 text-center">
                    Todos los socios presentan actividad reciente
                  </p>
                ) : (
                  data.toReactivate.map((m: any) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono"
                    >
                      <div>
                        <Link
                          href={`/admin/miembros/${m.id}`}
                          className="font-medium text-white hover:text-amber-300 block"
                        >
                          {m.name}
                        </Link>
                        <span className="text-[0.65rem] text-neutral-500">
                          Última actividad: {new Date(m.last_activity).toLocaleDateString()}
                        </span>
                      </div>

                      <Link
                        href={`/admin/miembros/${m.id}`}
                        className="px-3 py-1 rounded-lg bg-neutral-800 text-amber-300 hover:bg-neutral-700 text-[0.68rem]"
                      >
                        Contactar →
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: POINTS ASSIGNMENT & LEDGER
          ========================================================================= */}
      {activeTab === "points" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Member Selection Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono font-semibold text-white uppercase">
                1. SELECCIONAR SOCIO ({filteredPointsMembers.length})
              </h2>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, # o cel..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {loadingPoints ? (
                <div className="py-12 text-center text-xs font-mono text-neutral-500">
                  Cargando socios...
                </div>
              ) : filteredPointsMembers.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-neutral-500">
                  No se encontraron socios
                </div>
              ) : (
                filteredPointsMembers.map((m) => {
                  const isSelected = selectedMember?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between text-xs font-mono ${
                        isSelected
                          ? "bg-amber-400/10 border-amber-400 text-white ring-1 ring-amber-400 shadow-md"
                          : "bg-neutral-950 border-neutral-850 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {m.fullName}
                          </span>
                          <span className="text-[0.62rem] px-2 py-0.5 rounded bg-neutral-800 text-amber-300">
                            #{m.memberNumber}
                          </span>
                        </div>
                        <div className="text-[0.68rem] text-neutral-400 flex items-center gap-2">
                          <span>{m.phone}</span>
                          <span>•</span>
                          <span>{m.city}</span>
                          <span>•</span>
                          <span>{m.tier}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-bold text-amber-400 block">
                          {m.pointsBalance} PTS
                        </span>
                        <span className="text-[0.62rem] text-neutral-500">
                          {m.transactionsCount} movimientos
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Points Adjustment Form Column */}
          <div className="lg:col-span-5 bg-neutral-950 border border-neutral-850 rounded-2xl p-6 space-y-6 shadow-xl sticky top-24">
            <div>
              <h3 className="text-sm font-semibold text-white uppercase font-mono tracking-wider">
                2. ASIGNAR O DEDUCIR PUNTOS
              </h3>
              <p className="text-xs text-neutral-400 mt-1 font-sans">
                El movimiento quedará registrado en el ledger inmutable y en la bitácora de auditoría.
              </p>
            </div>

            {selectedMember ? (
              <form onSubmit={handleAssignPoints} className="space-y-4">
                {/* Selected Member Header */}
                <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-[0.62rem] font-mono text-neutral-400 block">
                      SOCIO SELECCIONADO
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                      {selectedMember.fullName} (#{selectedMember.memberNumber})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[0.62rem] font-mono text-neutral-400 block">
                      SALDO ACTUAL
                    </span>
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {selectedMember.pointsBalance} PTS
                    </span>
                  </div>
                </div>

                {/* Amount presets */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-300 block">
                    MONTO DE PUNTOS
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {[20, 50, 100, 200, -50].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPointsAmount(amt)}
                        className={`py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                          pointsAmount === amt
                            ? "bg-amber-400 text-black shadow"
                            : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                        }`}
                      >
                        {amt > 0 ? `+${amt}` : amt}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(parseInt(e.target.value, 10) || 0)}
                    required
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-sm font-mono text-white text-center font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Adjustment Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-300 block">
                    TIPO DE OPERACIÓN
                  </label>
                  <select
                    value={pointsType}
                    onChange={(e) => setPointsType(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="EVENT_ATTENDANCE">ASISTENCIA A EVENTO (+pts)</option>
                    <option value="REFERRAL">REFERIDO DE AMIGO (+pts)</option>
                    <option value="WELCOME_BONUS">BONO DE BIENVENIDA (+pts)</option>
                    <option value="MANUAL_ADJUSTMENT">AJUSTE MANUAL / CORTESÍA</option>
                    <option value="BENEFIT_REDEEM">DEDUCCIÓN POR CONSUMO (-pts)</option>
                  </select>
                </div>

                {/* Reason Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-300 block">
                    MOTIVO / NOTA DE AUDITORÍA *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Asistencia confirmada a Gran Inauguración"
                    value={pointsReason}
                    onChange={(e) => setPointsReason(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Feedback */}
                {pointsFeedback && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono text-center ${
                      pointsFeedback.error
                        ? "bg-red-950/70 border-red-500/40 text-red-300"
                        : "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
                    }`}
                  >
                    {pointsFeedback.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingPoints || pointsAmount === 0 || !pointsReason.trim()}
                  className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg disabled:opacity-50"
                >
                  {submittingPoints ? "REGISTRANDO..." : "REGISTRAR EN LEDGER DE PUNTOS"}
                </button>
              </form>
            ) : (
              <div className="py-16 text-center text-xs font-mono text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                Selecciona un socio de la lista izquierda para asignar puntos
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: REWARDS CATALOG
          ========================================================================= */}
      {activeTab === "rewards" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-mono font-semibold text-white uppercase">
                CATÁLOGO DE PREMIOS OFICIALES ({rewards.length})
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Recompensas canjeables por los miembros en la app móvil y en puerta/barra
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNewRewardModal(true)}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 transition-colors shadow"
            >
              <Plus className="w-4 h-4" />
              <span>AGREGAR PREMIO</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((r) => (
              <div
                key={r.id}
                className="bg-neutral-950 border border-neutral-850 rounded-2xl p-6 space-y-4 shadow-lg hover:border-amber-400/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.62rem] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 font-bold uppercase">
                      {r.category}
                    </span>
                    <span className="text-lg font-mono font-bold text-amber-400">
                      {r.points_cost || r.pointsCost} PTS
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white font-mono uppercase">
                    {r.title}
                  </h3>

                  <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                    {r.description}
                  </p>

                  {r.terms && (
                    <p className="text-[0.68rem] text-neutral-500 font-mono pt-2 border-t border-neutral-850">
                      Condición: {r.terms}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-850 flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-400">
                    Stock: <strong className="text-white">{r.stock ?? 50} u.</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 text-[0.62rem] font-bold uppercase">
                    ACTIVO
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* New Reward Modal */}
          {showNewRewardModal && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
                <button
                  onClick={() => setShowNewRewardModal(false)}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                >
                  ✕
                </button>

                <div>
                  <h3 className="text-base font-mono font-bold text-white uppercase">
                    CREAR NUEVA RECOMPENSA
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 font-sans">
                    Agrega un producto o experiencia canjeable por puntos.
                  </p>
                </div>

                <form onSubmit={handleCreateReward} className="space-y-4 text-xs font-mono">
                  <div className="space-y-1">
                    <label className="text-neutral-300">TÍTULO DEL PREMIO *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Gorra Edición Especial Club"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-neutral-300">COSTO EN PUNTOS *</label>
                      <input
                        type="number"
                        required
                        value={newCost}
                        onChange={(e) => setNewCost(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-neutral-300">CATEGORÍA</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="MERCHANDISE">MERCHANDISE</option>
                        <option value="BOTTLE">BOTELLAS</option>
                        <option value="EXPERIENCE">EXPERIENCIA</option>
                        <option value="COURTESY">CORTESÍA</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300">DESCRIPCIÓN</label>
                    <textarea
                      rows={2}
                      placeholder="Detalles sobre el material, presentación o servicio..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-neutral-300">STOCK INICIAL</label>
                      <input
                        type="number"
                        value={newStock}
                        onChange={(e) => setNewStock(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-neutral-300">TÉRMINOS / LUGAR DE ENTREGA</label>
                      <input
                        type="text"
                        placeholder="Ej: En barra principal con QR"
                        value={newTerms}
                        onChange={(e) => setNewTerms(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowNewRewardModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingReward}
                      className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase transition-colors"
                    >
                      {savingReward ? "Guardando..." : "Crear Premio"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: REDEMPTIONS & FULFILLMENT
          ========================================================================= */}
      {activeTab === "redemptions" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-mono font-semibold text-white uppercase">
                VALIDACIÓN Y ENTREGA DE CANJES ({filteredRedemptions.length})
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Valida el código de 6 caracteres del socio y marca el premio como entregado.
              </p>
            </div>

            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar código (BC-...) o socio..."
                value={searchRedemption}
                onChange={(e) => setSearchRedemption(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="space-y-3">
            {loadingRewards ? (
              <div className="py-16 text-center text-xs font-mono text-neutral-500">
                Cargando canjes...
              </div>
            ) : filteredRedemptions.length === 0 ? (
              <div className="py-16 text-center text-xs font-mono text-neutral-500 bg-neutral-950 border border-neutral-850 rounded-2xl">
                No hay canjes registrados o coincidentes con la búsqueda
              </div>
            ) : (
              filteredRedemptions.map((red) => {
                const isPending = red.status === "PENDING";
                return (
                  <div
                    key={red.id}
                    className="p-5 rounded-2xl bg-neutral-950 border border-neutral-850 hover:border-neutral-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-mono font-bold text-amber-300">
                          {red.redemptionCode}
                        </span>
                        <span
                          className={`text-[0.62rem] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            isPending
                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                              : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/40"
                          }`}
                        >
                          {isPending ? "PENDIENTE DE ENTREGA" : "ENTREGADO ✓"}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">
                          {red.pointsSpent} pts
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-white font-mono uppercase">
                        {red.rewardTitle}
                      </h4>

                      <div className="text-xs text-neutral-400 font-mono flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          Socio: <strong>{red.member?.name || "Socio del Club"}</strong> (
                          #{red.member?.memberNumber || "---"})
                        </span>
                        <span>Tel: {red.member?.phone || "---"}</span>
                        <span>Fecha: {new Date(red.createdAt).toLocaleString("es-MX")}</span>
                      </div>

                      {red.fulfilledAt && (
                        <p className="text-[0.68rem] text-emerald-400 font-mono">
                          ✓ Entregado el {new Date(red.fulfilledAt).toLocaleString("es-MX")} por{" "}
                          {red.fulfilledBy || "Staff"}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <button
                          type="button"
                          disabled={fulfillingId === red.id}
                          onClick={() => handleFulfillRedemption(red.id)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-colors shadow flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {fulfillingId === red.id ? "VALIDANDO..." : "VALIDAR Y ENTREGAR"}
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs font-mono text-emerald-400 font-semibold px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20">
                          Entrega validada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
