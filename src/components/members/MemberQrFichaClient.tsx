"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Gift,
  Loader2,
  Lock,
  QrCode,
} from "lucide-react";
import type { MemberQrFicha } from "@/lib/members/qr-ficha-server";

interface Props {
  token: string;
  initialFicha: MemberQrFicha;
  authorizedActor: {
    id: string;
    name: string;
    role: string;
  } | null;
}

function formatDateTimeMX(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MemberQrFichaClient({
  token,
  initialFicha,
  authorizedActor,
}: Props) {
  const [ficha, setFicha] = useState<MemberQrFicha>(initialFicha);
  const [registering, setRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [visitSuccess, setVisitSuccess] = useState<{
    visitNumber: number;
    employeeName: string;
    visitedAt: string;
  } | null>(null);
  const [visitDuplicate, setVisitDuplicate] = useState<{
    firstVisitAt: string;
    firstEmployeeName: string;
  } | null>(null);

  const handleRegisterVisit = async () => {
    if (!authorizedActor) return;
    setRegistering(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_visit",
          qrToken: token,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || "No fue posible registrar la visita.");
        return;
      }

      if (data.ficha) {
        setFicha(data.ficha);
      }

      if (data.duplicate) {
        setVisitDuplicate({
          firstVisitAt: data.firstVisitAt,
          firstEmployeeName: data.firstEmployeeName,
        });
      } else {
        setVisitSuccess({
          visitNumber: data.visitNumber,
          employeeName: data.employeeName,
          visitedAt: data.visitedAt,
        });
      }
    } catch {
      setErrorMsg("Error de red al registrar la visita.");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#EAB308]/35 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 text-left">
      {/* Encabezado Estado ACTIVO / INACTIVO */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-widest uppercase font-bold border ${
            ficha.member.is_active
              ? "bg-emerald-950/70 border-emerald-500/35 text-emerald-400"
              : "bg-red-950/70 border-red-500/35 text-red-400"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              ficha.member.is_active
                ? "bg-emerald-400 animate-pulse"
                : "bg-red-400"
            }`}
          />
          <span>MEMBRESÍA: {ficha.member.status_label}</span>
        </span>

        <span className="text-xs font-mono font-bold text-[#EAB308] tracking-widest">
          {ficha.member.formatted_number}
        </span>
      </div>

      {/* Datos del Socio */}
      <div className="border-b border-white/10 pb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/45 block">
          SOCIO CLUB BACACHÁ
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif text-white mt-1">
          {ficha.member.full_name}
        </h1>
        <p className="text-xs font-mono text-white/50 mt-1">
          Socio {ficha.member.formatted_number} · Nivel{" "}
          {ficha.member.membership_level} · Desde {ficha.member.since_year}
        </p>
      </div>

      {/* Estadísticas: Visitas, Nivel Fidelización, Puntos */}
      <div
        className={`grid ${
          ficha.stats.handles_points ? "grid-cols-3" : "grid-cols-2"
        } gap-3`}
      >
        <div className="bg-black/70 border border-white/10 rounded-2xl p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/45 block">
            Total Visitas
          </span>
          <span className="text-2xl font-serif font-bold text-white mt-1 block">
            {ficha.stats.total_visits}
          </span>
        </div>

        <div className="bg-black/70 border border-white/10 rounded-2xl p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/45 block">
            Fidelización
          </span>
          <span className="text-xs font-mono font-bold text-[#EAB308] mt-1.5 block">
            {ficha.stats.loyalty_level}
          </span>
        </div>

        {ficha.stats.handles_points && (
          <div className="bg-black/70 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/45 block">
              Puntos
            </span>
            <span className="text-2xl font-serif font-bold text-[#EAB308] mt-1 block">
              {ficha.stats.points_balance ?? 0}
            </span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Confirmación de Visita Registrada */}
      {visitSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2 text-xs font-mono">
          <p className="text-emerald-300 font-bold text-sm">
            ✅ VISITA REGISTRADA
          </p>
          <p className="text-white">¡Bienvenido, {ficha.member.full_name}!</p>
          <p className="text-[#EAB308]">SOCIO {ficha.member.formatted_number}</p>
          <p className="text-white/80">
            Visita número: <strong>{visitSuccess.visitNumber}</strong>
          </p>
          <p className="text-white/80">
            Registrado por: <strong>{visitSuccess.employeeName}</strong>
          </p>
          <p className="text-white/60">
            Fecha y hora: {formatDateTimeMX(visitSuccess.visitedAt)}
          </p>
        </div>
      )}

      {/* Aviso de Visita Ya Registrada en la misma Jornada */}
      {visitDuplicate && (
        <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2 text-xs font-mono">
          <p className="text-amber-300 font-bold text-sm">
            ⚠️ VISITA YA REGISTRADA
          </p>
          <p className="text-white">{ficha.member.full_name}</p>
          <p className="text-[#EAB308]">Socio {ficha.member.formatted_number}</p>
          <p className="text-white/80">Este miembro ya registró su visita.</p>
          <p className="text-amber-200">
            Primer registro: {formatDateTimeMX(visitDuplicate.firstVisitAt)}
          </p>
        </div>
      )}

      {/* Botón REGISTRAR VISITA (requiere sesión de empleado autorizado) */}
      {authorizedActor ? (
        !visitSuccess &&
        !visitDuplicate &&
        ficha.member.is_active && (
          <div className="space-y-2">
            <button
              type="button"
              disabled={registering}
              onClick={handleRegisterVisit}
              className="w-full py-4 px-6 rounded-2xl bg-[#EAB308] hover:bg-[#CA8A04] disabled:opacity-50 text-black font-mono text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(234,179,8,0.28)]"
            >
              {registering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrando visita...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  REGISTRAR VISITA
                </>
              )}
            </button>
            <p className="text-[10px] font-mono text-center text-white/45">
              Operador activo: {authorizedActor.name} ({authorizedActor.role})
            </p>
          </div>
        )
      ) : (
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-center">
          <p className="text-[11px] text-white/60 leading-relaxed">
            El registro de visitas requiere una sesión activa de personal
            autorizado del club.
          </p>
          <Link
            href="/scanner"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono uppercase tracking-widest text-[#EAB308] font-bold transition-all"
          >
            <QrCode className="w-4 h-4" />
            Personal del Club: Iniciar sesión en /scanner
          </Link>
        </div>
      )}

      {/* Beneficios Disponibles */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#EAB308]" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-white font-bold">
              Beneficios Disponibles ({ficha.available_benefits.length})
            </h2>
          </div>
        </div>

        {ficha.available_benefits.length === 0 ? (
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 text-center text-xs font-mono text-white/45">
            Sin beneficios disponibles
          </div>
        ) : (
          <div className="space-y-2.5">
            {ficha.available_benefits.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-2xl bg-black/70 border border-[#EAB308]/25 space-y-1"
              >
                <p className="text-sm font-bold text-white">{b.title}</p>
                {b.phrase && (
                  <p className="text-xs text-[#EAB308]">{b.phrase}</p>
                )}
                {b.terms && (
                  <p className="text-[11px] text-white/60 whitespace-pre-line border-t border-white/10 pt-2 mt-1">
                    {b.terms}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Cláusulas Oficiales de Promociones */}
        <div className="p-3.5 rounded-2xl bg-black/50 border border-[#EAB308]/20 text-[11px] font-mono text-white/65 space-y-1">
          <p className="text-[#EAB308] font-bold">
            Club Bacachá | Cantina Dolores
          </p>
          <p>• Promociones exclusivas para miembros del Club Bacachá.</p>
          <p>• Límite de una promoción por miembro.</p>
          <p>• Válidas hasta las 11:59 pm</p>
          <p className="text-white/50 pt-1">
            Únete al Club Bacachá en{" "}
            <a
              href="https://www.bacacha.com"
              className="text-[#EAB308] underline"
            >
              &ldquo;www.bacacha.com&rdquo;
            </a>{" "}
            (https://www.bacacha.com).
          </p>
        </div>
      </div>

      {/* Beneficios Ya Utilizados */}
      {ficha.used_benefits.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-white/50" />
            <h3 className="text-xs font-mono uppercase tracking-widest text-white/70 font-bold">
              Beneficios Utilizados ({ficha.used_benefits.length})
            </h3>
          </div>
          <div className="space-y-1.5">
            {ficha.used_benefits.map((ub) => (
              <div
                key={ub.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex justify-between text-xs"
              >
                <span className="text-white/80">{ub.title}</span>
                <span className="text-[10px] font-mono text-white/45">
                  {formatDateTimeMX(ub.used_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

