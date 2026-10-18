"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Lock, ShieldAlert, ArrowRight, KeyRound } from "lucide-react";

interface Props {
  isSetupNeeded?: boolean;
  onSuccess: () => void;
}

export function AdminLoginGate({ isSetupNeeded = false, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSetupNeeded) {
      if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres");
        return;
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden");
        return;
      }
    } else {
      if (!password) {
        setError("Introduce la contraseña");
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = isSetupNeeded ? "/api/admin/auth/setup" : "/api/admin/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Acceso denegado");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Error de conexión al servidor");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      {/* Background subtle glow */}
      <div className="absolute w-[500px] h-[500px] bg-red-950/20 rounded-full blur-[140px] pointer-events-none -top-32" />
      <div className="absolute w-[400px] h-[400px] bg-amber-950/10 rounded-full blur-[140px] pointer-events-none -bottom-32" />

      <div className="w-full max-w-md relative z-10 space-y-10 text-center">
        {/* Centered official Club Bacachá logo */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <BrandLogo size="lg" className="tracking-[0.28em] text-3xl sm:text-4xl text-white" />
          <div className="h-px w-16 bg-neutral-800" />
        </div>

        {/* Text Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[0.65rem] tracking-[0.25em] uppercase text-neutral-400 font-mono">
            <Lock className="w-3 h-3 text-neutral-400" />
            <span>ACCESO PRIVADO</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif tracking-[0.18em] text-neutral-100 uppercase">
            ADMINISTRACIÓN CLUB BACACHÁ
          </h1>
          <p className="text-xs text-neutral-500 font-sans tracking-wide">
            {isSetupNeeded
              ? "Configuración única de la contraseña de acceso al panel"
              : "Ingresa tu contraseña autorizada para acceder al CRM"}
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-neutral-950/80 border border-neutral-800/80 p-8 rounded-2xl shadow-2xl backdrop-blur-md text-left space-y-6"
        >
          {error && (
            <div className="p-3.5 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="admin-password"
              className="block text-[0.68rem] tracking-[0.22em] uppercase text-neutral-400 font-mono"
            >
              {isSetupNeeded ? "NUEVA CONTRASEÑA" : "CONTRASEÑA"}
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="••••••••••••"
                className="w-full bg-black border border-neutral-800 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 text-white rounded-xl px-4 py-3.5 text-sm tracking-widest placeholder:text-neutral-700 transition-all font-mono"
              />
              <KeyRound className="w-4 h-4 text-neutral-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {isSetupNeeded && (
            <div className="space-y-2">
              <label
                htmlFor="confirm-password"
                className="block text-[0.68rem] tracking-[0.22em] uppercase text-neutral-400 font-mono"
              >
                CONFIRMAR CONTRASEÑA
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-black border border-neutral-800 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 text-white rounded-xl px-4 py-3.5 text-sm tracking-widest placeholder:text-neutral-700 transition-all font-mono"
              />
              <p className="text-[0.68rem] text-neutral-500 font-mono">
                Mínimo 8 caracteres. Se almacenará con cifrado scrypt seguro.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-neutral-100 hover:bg-white text-black font-semibold text-xs tracking-[0.2em] uppercase py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-neutral-800/30"
          >
            <span>
              {loading
                ? "VALIDANDO..."
                : isSetupNeeded
                ? "ESTABLECER CONTRASEÑA Y ENTRAR"
                : "ENTRAR AL PANEL"}
            </span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center text-[0.65rem] tracking-[0.18em] uppercase text-neutral-600 font-mono">
          <span>CLUB BACACHÁ · SISTEMA DE ADMINISTRACIÓN Y CRM SEGURO</span>
        </div>
      </div>
    </div>
  );
}
