"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

interface VisitMetrics {
  todayVisits: number;
  uniqueMembersToday: number;
  uniqueMembersAllTime: number;
  weekVisits: number;
  monthVisits: number;
  totalVisitsAllTime: number;
}

interface TopMemberRow {
  memberId: string;
  memberNumber: string;
  formattedNumber: string;
  memberName: string;
  membershipLevel: string;
  status: string;
  totalVisits: number;
  lastVisitAt: string;
  lastEmployeeName: string;
  lastEmployeeRole: string;
}

interface EmployeeStatRow {
  id: string;
  name: string;
  role: string;
  status: string;
  visitsToday: number;
  visitsTotal: number;
  lastRegisteredAt: string | null;
}

interface HourlyBucket {
  hour: number;
  label: string;
  count: number;
}

interface VisitRecordRow {
  id: string;
  memberId: string;
  memberNumber: string;
  formattedNumber: string;
  memberName: string;
  memberStatus: string;
  membershipLevel: string;
  employeeId: string | null;
  employeeName: string;
  employeeRole: string;
  shiftDate: string;
  visitNumber: number;
  pointsAwarded: number;
  visitedAt: string;
  source: string;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminVisitasPage() {
  const [loading, setLoading] = useState(true);
  const [currentShiftDate, setCurrentShiftDate] = useState("");
  const [shiftCutoffHour, setShiftCutoffHour] = useState(6);
  const [metrics, setMetrics] = useState<VisitMetrics>({
    todayVisits: 0,
    uniqueMembersToday: 0,
    uniqueMembersAllTime: 0,
    weekVisits: 0,
    monthVisits: 0,
    totalVisitsAllTime: 0,
  });
  const [topMembers, setTopMembers] = useState<TopMemberRow[]>([]);
  const [byEmployee, setByEmployee] = useState<EmployeeStatRow[]>([]);
  const [peakHours, setPeakHours] = useState<HourlyBucket[]>([]);
  const [visits, setVisits] = useState<VisitRecordRow[]>([]);

  // Filtros
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const fetchVisitsData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (dateFrom) qs.set("dateFrom", dateFrom);
      if (dateTo) qs.set("dateTo", dateTo);
      if (memberSearch.trim()) qs.set("memberSearch", memberSearch.trim());
      if (employeeId) qs.set("employeeId", employeeId);

      const res = await fetch(`/api/admin/visits?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentShiftDate(data.currentShiftDate || "");
        setShiftCutoffHour(Number(data.rules?.shift_cutoff_hour ?? 6));
        setMetrics(
          data.metrics || {
            todayVisits: 0,
            uniqueMembersToday: 0,
            uniqueMembersAllTime: 0,
            weekVisits: 0,
            monthVisits: 0,
            totalVisitsAllTime: 0,
          }
        );
        setTopMembers(data.topMembers || []);
        setByEmployee(data.byEmployee || []);
        setPeakHours(data.peakHours || []);
        setVisits(data.visits || []);
      }
    } catch {
      // Manejo silencioso
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, memberSearch, employeeId]);

  useEffect(() => {
    fetchVisitsData();
  }, [fetchVisitsData]);

  const handleExportCsv = () => {
    const qs = new URLSearchParams();
    if (dateFrom) qs.set("dateFrom", dateFrom);
    if (dateTo) qs.set("dateTo", dateTo);
    if (memberSearch.trim()) qs.set("memberSearch", memberSearch.trim());
    if (employeeId) qs.set("employeeId", employeeId);
    qs.set("format", "csv");
    window.open(`/api/admin/visits?${qs.toString()}`, "_blank");
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 text-white">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-[#EAB308] font-bold">
            CONTROL DE ASISTENCIA · TIEMPO REAL
          </span>
          <h1 className="text-2xl lg:text-3xl font-serif tracking-wide text-white mt-1">
            HISTORIAL Y ESTADÍSTICAS DE VISITAS
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Jornada operativa actual:{" "}
            <span className="text-white font-mono font-bold">
              {currentShiftDate || "Hoy"}
            </span>{" "}
            (Corte de jornada: {String(shiftCutoffHour).padStart(2, "0")}:00 hrs)
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/scanner"
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono uppercase tracking-widest text-white flex items-center gap-2 transition-all"
          >
            <QrCode className="w-4 h-4 text-[#EAB308]" />
            Ir al Scanner
            <ExternalLink className="w-3.5 h-3.5 text-white/40" />
          </Link>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-5 py-2.5 rounded-xl bg-[#EAB308] hover:bg-[#CA8A04] text-black font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-[0_8px_25px_rgba(234,179,8,0.25)] transition-all"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs Principales de Visitas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0B0B0B] border border-[#EAB308]/35 rounded-2xl p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#EAB308] block">
            Total de Visitas del Día (Jornada)
          </span>
          <span className="text-3xl font-serif font-bold text-white mt-1 block">
            {metrics.todayVisits}
          </span>
          <span className="text-[11px] text-white/45 mt-1 block">
            Jornada {currentShiftDate}
          </span>
        </div>

        <div className="bg-[#0B0B0B] border border-emerald-500/30 rounded-2xl p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
            Miembros Únicos que Asistieron
          </span>
          <span className="text-3xl font-serif font-bold text-emerald-400 mt-1 block">
            {metrics.uniqueMembersToday}
          </span>
          <span className="text-[11px] text-white/45 mt-1 block">
            {metrics.uniqueMembersAllTime} socios únicos históricos
          </span>
        </div>

        <div className="bg-[#0B0B0B] border border-white/10 rounded-2xl p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 block">
            Visitas de la Semana (7 días)
          </span>
          <span className="text-3xl font-serif font-bold text-white mt-1 block">
            {metrics.weekVisits}
          </span>
          <span className="text-[11px] text-white/45 mt-1 block">
            Últimos 7 días naturales
          </span>
        </div>

        <div className="bg-[#0B0B0B] border border-white/10 rounded-2xl p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 block">
            Visitas del Mes (30 días)
          </span>
          <span className="text-3xl font-serif font-bold text-white mt-1 block">
            {metrics.monthVisits}
          </span>
          <span className="text-[11px] text-white/45 mt-1 block">
            Total histórico: {metrics.totalVisitsAllTime}
          </span>
        </div>
      </div>

      {/* Analítica en 3 Columnas: Socios más frecuentes, Empleados registradores, Horarios con mayor actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Socios más frecuentes y última visita */}
        <div className="bg-[#0B0B0B] border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Award className="w-4 h-4 text-[#EAB308]" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-white font-bold">
              Socios Más Frecuentes
            </h2>
          </div>

          {topMembers.length === 0 ? (
            <p className="text-xs text-white/40 py-6 text-center font-mono">
              Sin visitas registradas todavía.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {topMembers.slice(0, 8).map((tm) => (
                <div
                  key={tm.memberId}
                  className="p-3 rounded-xl bg-black border border-white/10 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/miembros/${tm.memberId}`}
                      className="font-bold text-white hover:text-[#EAB308] truncate block"
                    >
                      <span className="text-[#EAB308] font-mono mr-1.5">
                        {tm.formattedNumber}
                      </span>
                      {tm.memberName}
                    </Link>
                    <p className="text-[10px] text-white/45 font-mono mt-0.5">
                      Últ. visita: {formatDateTime(tm.lastVisitAt)} · Por:{" "}
                      {tm.lastEmployeeName}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#EAB308]/15 border border-[#EAB308]/30 text-[#EAB308] font-mono font-bold shrink-0">
                    {tm.totalVisits} visitas
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empleados que registraron cada entrada */}
        <div className="bg-[#0B0B0B] border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#EAB308]" />
              <h2 className="text-xs font-mono uppercase tracking-widest text-white font-bold">
                Registros por Empleado
              </h2>
            </div>
            <Link
              href="/admin/empleados"
              className="text-[10px] font-mono text-[#EAB308] hover:underline"
            >
              Ver equipo →
            </Link>
          </div>

          {byEmployee.length === 0 ? (
            <p className="text-xs text-white/40 py-6 text-center font-mono">
              Sin registros de empleados aún.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {byEmployee.map((emp) => (
                <div
                  key={emp.id}
                  className="p-3 rounded-xl bg-black border border-white/10 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{emp.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-white/10 text-white/70">
                        {emp.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/45 font-mono mt-0.5">
                      Últ. registro: {formatDateTime(emp.lastRegisteredAt)}
                    </p>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="text-sm font-bold text-emerald-400 block">
                      {emp.visitsTotal} total
                    </span>
                    <span className="text-[10px] text-white/50">
                      Hoy: {emp.visitsToday}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Horarios con mayor actividad */}
        <div className="bg-[#0B0B0B] border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Clock className="w-4 h-4 text-[#EAB308]" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-white font-bold">
              Horarios con Mayor Actividad
            </h2>
          </div>

          {peakHours.length === 0 ? (
            <p className="text-xs text-white/40 py-6 text-center font-mono">
              Los horarios pico se mostrarán conforme se registren visitas.
            </p>
          ) : (
            <div className="space-y-3">
              {peakHours.map((ph) => {
                const maxCount = Math.max(...peakHours.map((h) => h.count), 1);
                const pct = Math.round((ph.count / maxCount) * 100);
                return (
                  <div key={ph.hour} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-white font-bold">
                        {ph.label} - {String((ph.hour + 1) % 24).padStart(2, "0")}
                        :00 hrs
                      </span>
                      <span className="text-[#EAB308]">{ph.count} visitas</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-[#EAB308] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filtros por Fecha, Miembro y Empleado */}
      <div className="bg-[#0B0B0B] border border-white/10 rounded-3xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-white/45 mb-1">
              Buscar Miembro (#ID o Nombre)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Ej. #000049 o Laura..."
                className="w-full bg-black border border-white/15 focus:border-[#EAB308] rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-white/45 mb-1">
              Desde Jornada
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-black border border-white/15 focus:border-[#EAB308] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-white/45 mb-1">
              Hasta Jornada
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-black border border-white/15 focus:border-[#EAB308] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-white/45 mb-1">
              Filtrar por Empleado
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-black border border-white/15 focus:border-[#EAB308] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
            >
              <option value="">Todos los empleados</option>
              {byEmployee.map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setMemberSearch("");
                setEmployeeId("");
              }}
              className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono uppercase tracking-widest text-white/70"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tabla Detallada de Visitas */}
      <div className="bg-[#0B0B0B] border border-white/10 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-white font-bold">
            Bitácora de Entradas Registradas ({visits.length})
          </h2>
          <button
            type="button"
            onClick={fetchVisitsData}
            className="text-xs font-mono text-white/50 hover:text-white flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-[#EAB308] animate-spin" />
            <span className="text-xs font-mono uppercase tracking-widest text-white/40">
              Consultando bitácora de visitas en Supabase...
            </span>
          </div>
        ) : visits.length === 0 ? (
          <div className="py-14 text-center text-xs font-mono text-white/40">
            No se encontraron visitas con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/45">
                  <th className="py-3.5 px-5">Fecha y Hora</th>
                  <th className="py-3.5 px-4">Jornada</th>
                  <th className="py-3.5 px-4">Member ID</th>
                  <th className="py-3.5 px-4">Socio</th>
                  <th className="py-3.5 px-4">Visita #</th>
                  <th className="py-3.5 px-4">Registrado Por (Empleado)</th>
                  <th className="py-3.5 px-5 text-right">Perfil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {visits.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono text-xs text-white/80">
                      {formatDateTime(v.visitedAt)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-white/55">
                      {v.shiftDate}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#EAB308]">
                      {v.formattedNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      {v.memberName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                        Visita #{v.visitNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="text-white font-medium">
                        {v.employeeName}
                      </span>
                      <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-white/10 text-white/70">
                        {v.employeeRole}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        href={`/admin/miembros/${v.memberId}`}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white"
                      >
                        Ver socio →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

