"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  Award,
  Calendar,
  Gift,
  Share2,
  Cake,
  Activity,
  ArrowUpRight,
  MessageSquare,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface DashboardData {
  metrics: {
    totalMembers: number;
    todayRegistrations: number;
    sevenDaysRegistrations: number;
    thirtyDaysRegistrations: number;
    growthPercent: number;
    vipMembersCount: number;
    eventsCount: number;
    benefitsCount: number;
    referralsCount: number;
    activeRecentlyCount: number;
    toReactivateCount: number;
    totalInteractions: number;
  };
  cityCounts: Record<string, number>;
  acquisitionCounts: Record<string, number>;
  upcomingBirthdays: any[];
  categoryDistribution: Record<string, number>;
  dailyRegistrations: { date: string; count: number }[];
  recentMembers: any[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = () => {
    setLoading(true);
    fetch("/api/admin/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-xs font-mono tracking-widest text-neutral-400 uppercase">
          Calculando métricas en tiempo real...
        </p>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalMembers: 0,
    todayRegistrations: 0,
    sevenDaysRegistrations: 0,
    thirtyDaysRegistrations: 0,
    growthPercent: 0,
    vipMembersCount: 0,
    eventsCount: 0,
    benefitsCount: 0,
    referralsCount: 0,
    activeRecentlyCount: 0,
    toReactivateCount: 0,
    totalInteractions: 0,
  };

  const maxDaily = Math.max(
    1,
    ...(data?.dailyRegistrations?.map((d) => d.count) || [1])
  );

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase">
            CENTRO DE CONTROL & CRM
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Métricas oficiales y participación en tiempo real · Club Bacachá
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/miembros"
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs tracking-wider uppercase transition-colors shadow-lg shadow-amber-400/10 flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Gestionar Miembros</span>
          </Link>
          <Link
            href="/admin/fidelizacion"
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs tracking-wider uppercase transition-colors flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Ver Fidelización</span>
          </Link>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[0.68rem] font-mono tracking-widest uppercase">TOTAL MIEMBROS</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif text-white tracking-tight">
              {metrics.totalMembers}
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              +{metrics.growthPercent}%
            </span>
          </div>
          <p className="text-[0.68rem] text-neutral-500 font-mono">
            {metrics.todayRegistrations} hoy · {metrics.sevenDaysRegistrations} esta semana
          </p>
        </div>

        {/* VIP Members */}
        <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[0.68rem] font-mono tracking-widest uppercase">MIEMBROS VIP</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif text-white tracking-tight">
              {metrics.vipMembersCount}
            </span>
            <span className="text-[0.65rem] font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300">
              ALTA FIDELIDAD
            </span>
          </div>
          <p className="text-[0.68rem] text-neutral-500 font-mono">
            Acceso preferencial a experiencias privadas
          </p>
        </div>

        {/* Actividad Reciente */}
        <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[0.68rem] font-mono tracking-widest uppercase">ACTIVIDAD RECIENTE</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif text-emerald-400 tracking-tight">
              {metrics.activeRecentlyCount}
            </span>
            <span className="text-[0.68rem] text-neutral-400 font-mono">
              / {metrics.toReactivateCount} por reactivar
            </span>
          </div>
          <p className="text-[0.68rem] text-neutral-500 font-mono">
            Participaron en los últimos 30 días
          </p>
        </div>

        {/* Total Interacciones */}
        <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[0.68rem] font-mono tracking-widest uppercase">INTERACCIONES</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-serif text-white tracking-tight">
              {metrics.totalInteractions}
            </span>
            <span className="text-[0.68rem] text-neutral-400 font-mono">registradas</span>
          </div>
          <p className="text-[0.68rem] text-neutral-500 font-mono">
            {metrics.referralsCount} referidos · {metrics.eventsCount} eventos activos
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Registrations Bar Chart (14 days) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
                CRECIMIENTO DE AFILIADOS (ÚLTIMOS 14 DÍAS)
              </h2>
              <p className="text-[0.68rem] font-mono text-neutral-400">
                Evolución de registros verificados por día
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 font-semibold">
              +{metrics.thirtyDaysRegistrations} en 30 días
            </span>
          </div>

          {/* Bar Chart Container */}
          <div className="h-48 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-neutral-850">
            {(data?.dailyRegistrations || []).map((d) => {
              const heightPercent = Math.max(8, Math.round((d.count / maxDaily) * 100));
              const isToday = d.date === new Date().toISOString().split("T")[0];

              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-8 hidden group-hover:flex px-2 py-1 bg-neutral-800 text-white text-[0.62rem] font-mono rounded shadow-lg whitespace-nowrap z-10">
                    {d.date}: {d.count} miembros
                  </div>

                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                      isToday
                        ? "bg-amber-400 group-hover:bg-amber-300"
                        : d.count > 0
                        ? "bg-neutral-600 group-hover:bg-neutral-400"
                        : "bg-neutral-850 group-hover:bg-neutral-800"
                    }`}
                  />
                  <span className="text-[0.6rem] font-mono text-neutral-400 truncate max-w-full">
                    {d.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[0.68rem] font-mono text-neutral-400">
            <span>Fuente: Base de datos oficial Supabase</span>
            <span>Actualizado en tiempo real</span>
          </div>
        </div>

        {/* Distribution by City */}
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
              MIEMBROS POR CIUDAD
            </h2>
            <MapPin className="w-4 h-4 text-amber-400" />
          </div>

          <div className="space-y-3 pt-2">
            {Object.entries(data?.cityCounts || {}).length === 0 ? (
              <p className="text-xs text-neutral-500 font-mono py-8 text-center">
                Sin datos de ubicación registrados
              </p>
            ) : (
              Object.entries(data?.cityCounts || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([city, count]) => {
                  const pct = metrics.totalMembers > 0 ? Math.round((count / metrics.totalMembers) * 100) : 0;
                  return (
                    <div key={city} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-neutral-300">{city}</span>
                        <span className="text-neutral-400">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-amber-400/80 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Secondary Grid: Upcoming Birthdays & Recent Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Birthdays */}
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cake className="w-4 h-4 text-pink-400" />
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
                PRÓXIMOS CUMPLEAÑOS
              </h2>
            </div>
            <Link
              href="/admin/cumpleanos"
              className="text-[0.68rem] font-mono text-amber-400 hover:text-amber-300 uppercase"
            >
              Ver todos →
            </Link>
          </div>

          <div className="space-y-2.5 pt-1">
            {(!data?.upcomingBirthdays || data.upcomingBirthdays.length === 0) ? (
              <div className="py-8 text-center text-xs font-mono text-neutral-500">
                No hay cumpleaños registrados en los próximos 30 días
              </div>
            ) : (
              data.upcomingBirthdays.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-neutral-850"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white">
                      {m.first_name} {m.last_name}
                    </span>
                    <span className="text-[0.65rem] font-mono text-neutral-400">
                      #{m.member_number} · {m.birth_date} · {m.city}
                    </span>
                  </div>

                  <a
                    href={`https://wa.me/${(m.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                      `¡Feliz cumpleaños ${m.first_name || ""} de parte del Club Bacachá! 🍾 Queremos celebrarte en grande con una cortesía especial en tu próxima visita.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/70 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Felicitar</span>
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Members */}
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
                ÚLTIMOS MIEMBROS AFILIADOS
              </h2>
            </div>
            <Link
              href="/admin/miembros"
              className="text-[0.68rem] font-mono text-amber-400 hover:text-amber-300 uppercase"
            >
              Ver directorio completo →
            </Link>
          </div>

          <div className="space-y-2.5 pt-1">
            {(!data?.recentMembers || data.recentMembers.length === 0) ? (
              <div className="py-8 text-center text-xs font-mono text-neutral-500">
                Sin miembros registrados recientemente
              </div>
            ) : (
              data.recentMembers.map((m) => (
                <Link
                  key={m.id}
                  href={`/admin/miembros/${m.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/60 border border-neutral-850 hover:border-neutral-700 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-mono text-xs font-semibold text-amber-400">
                      {(m.first_name || "M")[0]}
                      {(m.last_name || "B")[0]}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-white group-hover:text-amber-300 transition-colors">
                        {m.first_name} {m.last_name}
                      </span>
                      <span className="text-[0.65rem] font-mono text-neutral-400">
                        #{m.member_number} · {m.city || "Sin ciudad"} · {m.created_at ? new Date(m.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-neutral-500 group-hover:text-white transition-colors">
                    Ver ficha →
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
