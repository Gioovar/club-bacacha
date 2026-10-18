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
  MessageSquare,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function LoyaltyPage() {
  const [timeframe, setTimeframe] = useState<"30d" | "60d" | "90d" | "all">("all");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchLoyalty();
  }, [timeframe]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            <span>ACTIVIDAD & BACACHÁ ENGAGEMENT SCORE</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Análisis de participación real · Puntuaciones basadas en acciones verificadas
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-800">
          {(["30d", "60d", "90d", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
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

      {/* Operational Suggestions Section */}
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
  );
}
