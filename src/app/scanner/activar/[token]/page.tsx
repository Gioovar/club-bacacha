"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export default function ScannerActivationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = typeof params?.token === "string" ? params.token : "";

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [employee, setEmployee] = useState<{
    id: string;
    name: string;
    phone: string;
    username: string;
    role: string;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setValid(false);
      setErrorMsg("Enlace de invitación incompleto.");
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch(
          `/api/scanner/activate?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setValid(false);
          setErrorMsg(
            data.error || "El enlace de invitación no es válido o ha expirado."
          );
        } else {
          setValid(true);
          setEmployee(data.employee);
        }
      } catch {
        setValid(false);
        setErrorMsg("Error de conexión al verificar el enlace de activación.");
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (password.length < 8) {
      setSubmitError("Tu contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Las contraseñas no coinciden. Verifícalas.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/scanner/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setSubmitError(data.error || "No fue posible activar tu cuenta.");
        return;
      }

      setActivated(true);
      setTimeout(() => {
        router.push("/scanner");
      }, 1600);
    } catch {
      setSubmitError("Error de red al activar tu cuenta. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-[#0B0B0B] border border-white/10 rounded-3xl p-7 sm:p-9 shadow-[0_25px_80px_rgba(0,0,0,0.9)]">
        {/* Cabecera Oficial Club Bacachá */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-16 h-16 rounded-full bg-black border border-[#EAB308]/30 flex items-center justify-center p-2 mb-4 shadow-[0_0_30px_rgba(234,179,8,0.12)]">
            <img
              src="/logo.png"
              alt="Club Bacachá"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-[#EAB308] font-bold">
            CLUB BACACHÁ · EQUIPO OPERATIVO
          </span>
          <h1 className="text-xl sm:text-2xl font-serif tracking-wide text-white mt-1.5">
            Activación de Acceso Scanner
          </h1>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center text-center gap-3">
            <Loader2 className="w-8 h-8 text-[#EAB308] animate-spin" />
            <p className="text-xs font-mono uppercase tracking-widest text-white/50">
              Verificando invitación segura...
            </p>
          </div>
        ) : !valid ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Enlace No Disponible
              </h2>
              <p className="text-sm text-white/60 leading-relaxed">
                {errorMsg}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/scanner"
                className="inline-flex items-center justify-center w-full py-3.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono uppercase tracking-widest text-white font-bold transition-all"
              >
                Ir a Iniciar Sesión (/scanner)
              </Link>
            </div>
          </div>
        ) : activated ? (
          <div className="space-y-5 text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                CUENTA ACTIVADA CON ÉXITO
              </span>
              <h2 className="text-lg font-serif text-white">
                ¡Bienvenido(a), {employee?.name}!
              </h2>
              <p className="text-xs text-white/60">
                Ingresando automáticamente al sistema de Scanner...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleActivate} className="space-y-5">
            {/* Tarjeta de identidad del empleado */}
            <div className="bg-white/[0.03] border border-[#EAB308]/25 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                  Integrante del Equipo
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-[#EAB308]/15 text-[#EAB308] border border-[#EAB308]/30">
                  {employee?.role}
                </span>
              </div>
              <p className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#EAB308]" />
                {employee?.name}
              </p>
              <div className="flex items-center justify-between text-xs text-white/50 font-mono pt-1 border-t border-white/5">
                <span>Tel: {employee?.phone}</span>
                <span>Usuario: {employee?.username}</span>
              </div>
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              Define tu contraseña personal para ingresar a{" "}
              <span className="text-white font-mono">bacacha.com/scanner</span>{" "}
              y registrar las visitas de nuestros socios.
            </p>

            {submitError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                {submitError}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50 mb-1.5">
                  Nueva Contraseña (mínimo 8 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-white/15 focus:border-[#EAB308] rounded-xl pl-10 pr-10 py-3 text-sm text-white outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50 mb-1.5">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="w-full bg-black border border-white/15 focus:border-[#EAB308] rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-xl bg-[#EAB308] hover:bg-[#CA8A04] disabled:opacity-50 text-black font-mono text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(234,179,8,0.25)]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activando acceso...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Activar mi Cuenta e Ingresar
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
