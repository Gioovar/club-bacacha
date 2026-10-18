"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2, Users, Award, MessageSquare, ArrowRight } from "lucide-react";

export default function AdminReferralsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/referrals")
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
            <Share2 className="w-6 h-6 text-emerald-400" />
            <span>RED DE REFERIDOS & EMBAJADORES</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Trazabilidad de invitaciones confirmadas y bonificación de puntos (+10 pts)
          </p>
        </div>
      </div>

      {/* Grid: Ambassador Ranking & Referrals History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ambassador Ranking */}
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              RANKING DE EMBAJADORES
            </h2>
          </div>

          <div className="space-y-2 pt-1">
            {(!data?.ambassadors || data.ambassadors.length === 0) ? (
              <p className="text-xs font-mono text-neutral-500 py-8 text-center">
                Aún no hay socios con referidos confirmados.
              </p>
            ) : (
              data.ambassadors.map((a: any, idx: number) => (
                <div
                  key={a.member.id}
                  className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-850 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-bold text-emerald-400 font-serif">
                      #{idx + 1}
                    </span>
                    <div>
                      <Link
                        href={`/admin/miembros/${a.member.id}`}
                        className="font-medium text-white hover:text-amber-300 block"
                      >
                        {a.member.first_name} {a.member.last_name}
                      </Link>
                      <span className="text-[0.65rem] text-neutral-500">
                        #{a.member.member_number} · {a.member.city}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">
                    {a.count} referidos
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Full Referrals Log */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
          <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
            REGISTROS POR INVITACIÓN VERIFICADOS
          </h2>

          <div className="space-y-3 pt-1">
            {(!data?.referrals || data.referrals.length === 0) ? (
              <p className="text-xs font-mono text-neutral-500 py-12 text-center">
                Sin registros de invitaciones en la base de datos.
              </p>
            ) : (
              data.referrals.map((r: any) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-neutral-400 text-[0.65rem] uppercase">Invitador</span>
                      <Link
                        href={`/admin/miembros/${r.referrer?.id}`}
                        className="text-white font-semibold hover:text-amber-300"
                      >
                        {r.referrer?.first_name} {r.referrer?.last_name} (#{r.referrer?.member_number})
                      </Link>
                    </div>

                    <ArrowRight className="w-4 h-4 text-neutral-600 shrink-0" />

                    <div className="flex flex-col">
                      <span className="text-neutral-400 text-[0.65rem] uppercase">Nuevo Socio</span>
                      <Link
                        href={`/admin/miembros/${r.referred?.id}`}
                        className="text-emerald-400 font-semibold hover:underline"
                      >
                        {r.referred?.first_name} {r.referred?.last_name} (#{r.referred?.member_number})
                      </Link>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[0.62rem]">
                      {r.status}
                    </span>
                    <span className="text-[0.65rem] text-neutral-500 block mt-1">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
