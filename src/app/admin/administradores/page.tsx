"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, UserCheck, ShieldAlert, KeyRound, Clock, Activity, Laptop } from "lucide-react";

export default function AdminUsersPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/administrators")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span>ADMINISTRADORES, SESIONES & AUDITORÍA</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Control de accesos compartidos, sesiones activas con tokens seguros y trazabilidad legal
          </p>
        </div>
      </div>

      {/* Grid: Administrators and Active Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Users */}
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              CUENTAS ADMINISTRATIVAS CONFIGURADAS
            </h2>
          </div>

          <div className="space-y-3 pt-1">
            {(!data?.users || data.users.length === 0) ? (
              <p className="text-xs font-mono text-neutral-500 py-6 text-center">
                Sin cuentas de administrador registradas.
              </p>
            ) : (
              data.users.map((u: any) => (
                <div
                  key={u.id}
                  className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="text-white font-semibold block">{u.name}</span>
                    <span className="text-neutral-500 text-[0.65rem]">
                      Usuario: @{u.username} · Creado el {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[0.65rem] font-bold">
                      {u.role}
                    </span>
                    <span className="text-[0.65rem] text-neutral-500 block mt-1">
                      Último login: {u.last_login_at ? new Date(u.last_login_at).toLocaleTimeString() : "—"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Sessions */}
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              SESIONES ACTIVAS (COOKIES SEGURAS)
            </h2>
          </div>

          <div className="space-y-3 pt-1">
            {(!data?.sessions || data.sessions.length === 0) ? (
              <p className="text-xs font-mono text-neutral-500 py-6 text-center">
                No hay sesiones activas en este momento.
              </p>
            ) : (
              data.sessions.map((s: any) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="text-white font-semibold block">IP: {s.ip_address || "127.0.0.1"}</span>
                    <span className="text-neutral-500 text-[0.65rem] truncate max-w-[200px] block">
                      {s.user_agent || "Navegador Web"}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[0.62rem]">
                      ACTIVA
                    </span>
                    <span className="text-[0.65rem] text-neutral-500 block mt-1">
                      Expira: {new Date(s.expires_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
            BITÁCORA DE AUDITORÍA (ÚLTIMAS ACCIONES)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-850 text-neutral-500 text-[0.62rem] uppercase tracking-wider">
                <th className="py-2.5">FECHA & HORA</th>
                <th className="py-2.5">ACTOR</th>
                <th className="py-2.5">ACCIÓN</th>
                <th className="py-2.5">DETALLES</th>
                <th className="py-2.5">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850/60">
              {(!data?.auditLogs || data.auditLogs.length === 0) ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    No hay eventos de auditoría registrados todavía.
                  </td>
                </tr>
              ) : (
                data.auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-neutral-900/40">
                    <td className="py-3 text-neutral-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 text-white font-semibold">
                      {log.actor_name}
                    </td>
                    <td className="py-3 text-amber-400">
                      {log.action}
                    </td>
                    <td className="py-3 text-neutral-400 text-[0.68rem] max-w-xs truncate">
                      {JSON.stringify(log.details || {})}
                    </td>
                    <td className="py-3 text-neutral-500 text-[0.65rem]">
                      {log.ip_address || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
