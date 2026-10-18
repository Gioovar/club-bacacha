"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  Gift,
  Share2,
  Users,
  Award,
  TrendingUp,
} from "lucide-react";

export default function AdminReportsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const metrics = data?.metrics || {
    totalMembers: 0,
    thirtyDaysRegistrations: 0,
    totalInteractions: 0,
    eventsCount: 0,
    benefitsCount: 0,
    referralsCount: 0,
    activeRecentlyCount: 0,
    toReactivateCount: 0,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <span>REPORTES EJECUTIVOS DE FIDELIZACIÓN</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Resumen consolidado de participación, canjes, asistencias y descargas autorizadas
          </p>
        </div>

        <a
          href="/api/admin/members/export"
          download
          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono flex items-center gap-2 transition-colors shadow-lg shadow-amber-400/10"
        >
          <Download className="w-4 h-4" />
          <span>Descargar Reporte CSV Completo</span>
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-2">
          <span className="text-[0.68rem] font-mono text-neutral-400 uppercase">AFILIACIÓN TOTAL</span>
          <div className="text-2xl font-bold font-serif text-white">{metrics.totalMembers} miembros</div>
          <p className="text-[0.65rem] font-mono text-neutral-500">+{metrics.thirtyDaysRegistrations} en los últimos 30 días</p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-2">
          <span className="text-[0.68rem] font-mono text-neutral-400 uppercase">INTERACCIONES</span>
          <div className="text-2xl font-bold font-serif text-amber-400">{metrics.totalInteractions} registradas</div>
          <p className="text-[0.65rem] font-mono text-neutral-500">Check-ins, canjes y contactos</p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-2">
          <span className="text-[0.68rem] font-mono text-neutral-400 uppercase">REFERIDOS CONFIRMADOS</span>
          <div className="text-2xl font-bold font-serif text-emerald-400">{metrics.referralsCount} conversiones</div>
          <p className="text-[0.65rem] font-mono text-neutral-500">Amigos invitados con alta completa</p>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-2">
          <span className="text-[0.68rem] font-mono text-neutral-400 uppercase">RETENCIÓN RECIENTE</span>
          <div className="text-2xl font-bold font-serif text-white">{metrics.activeRecentlyCount} activos</div>
          <p className="text-[0.65rem] font-mono text-neutral-500">{metrics.toReactivateCount} por reactivar</p>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Breakdown */}
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
          <h2 className="text-sm font-semibold text-white font-mono uppercase">
            Distribución por Ciudad
          </h2>
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(data?.cityCounts || {}).map(([c, count]: any) => (
              <div key={c} className="flex justify-between py-2 border-b border-neutral-850">
                <span className="text-neutral-300">{c}</span>
                <span className="text-amber-400 font-bold">{count} socios</span>
              </div>
            ))}
          </div>
        </div>

        {/* Acquisition Breakdown */}
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
          <h2 className="text-sm font-semibold text-white font-mono uppercase">
            Canales de Adquisición
          </h2>
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(data?.acquisitionCounts || {}).map(([src, count]: any) => (
              <div key={src} className="flex justify-between py-2 border-b border-neutral-850">
                <span className="text-neutral-300">{src}</span>
                <span className="text-emerald-400 font-bold">{count} socios</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
