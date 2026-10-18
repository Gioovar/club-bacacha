"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  KeyRound,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Award,
  RefreshCw,
} from "lucide-react";

export default function AdminSettingsPage() {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Scoring rules state
  const [scoringRules, setScoringRules] = useState({
    affiliation: 5,
    event_attendance: 20,
    benefit_redeemed: 15,
    referral_registered: 10,
    dynamic_verified: 10,
  });

  // Thresholds state
  const [thresholds, setThresholds] = useState({
    participativo_min: 20,
    destacado_min: 50,
    embajador_referrals_min: 2,
    reciente_dias: 30,
    reactivar_dias: 60,
  });

  const [savingRules, setSavingRules] = useState(false);
  const [rulesStatus, setRulesStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config?.scoring_rules) {
          setScoringRules(data.config.scoring_rules);
        }
        if (data?.config?.loyalty_thresholds) {
          setThresholds(data.config.loyalty_thresholds);
        }
      });
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 8) {
      setPasswordStatus({ success: false, message: "La nueva contraseña debe tener al menos 8 caracteres" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ success: false, message: "Las contraseñas no coinciden" });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordStatus({
          success: true,
          message: "Contraseña actualizada exitosamente. Por seguridad, deberás volver a ingresar.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setPasswordStatus({ success: false, message: data.error || "No se pudo actualizar la contraseña" });
      }
    } catch {
      setPasswordStatus({ success: false, message: "Error al conectar con el servidor" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRules(true);
    setRulesStatus(null);

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoringRules,
          loyaltyThresholds: thresholds,
        }),
      });

      if (res.ok) {
        setRulesStatus("Reglas guardadas exitosamente en Supabase");
        setTimeout(() => setRulesStatus(null), 3000);
      }
    } finally {
      setSavingRules(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-400" />
            <span>CONFIGURACIÓN DEL CRM & SEGURIDAD</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Gestión de credenciales maestras, parámetros de engagement y umbrales de fidelización
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Security / Password Form */}
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-5 shadow-xl">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              CAMBIAR CONTRASEÑA ADMINISTRATIVA
            </h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                Contraseña Actual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            {passwordStatus && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 ${
                  passwordStatus.success
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/60 border-red-500/40 text-red-300"
                }`}
              >
                {passwordStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span>{passwordStatus.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {passwordLoading ? "Actualizando..." : "Actualizar Contraseña & Revocar Sesiones"}
            </button>
          </form>
        </div>

        {/* Engagement Rules Form */}
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-5 shadow-xl">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
              REGLAS DE BACACHÁ ENGAGEMENT SCORE
            </h2>
          </div>

          <form onSubmit={handleSaveRules} className="space-y-4">
            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-850">
                <span className="text-neutral-300">Primera afiliación válida</span>
                <input
                  type="number"
                  value={scoringRules.affiliation}
                  onChange={(e) =>
                    setScoringRules({ ...scoringRules, affiliation: Number(e.target.value) })
                  }
                  className="w-20 bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-center text-amber-400 font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-850">
                <span className="text-neutral-300">Asistencia verificada a evento</span>
                <input
                  type="number"
                  value={scoringRules.event_attendance}
                  onChange={(e) =>
                    setScoringRules({ ...scoringRules, event_attendance: Number(e.target.value) })
                  }
                  className="w-20 bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-center text-amber-400 font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-850">
                <span className="text-neutral-300">Beneficio utilizado y validado</span>
                <input
                  type="number"
                  value={scoringRules.benefit_redeemed}
                  onChange={(e) =>
                    setScoringRules({ ...scoringRules, benefit_redeemed: Number(e.target.value) })
                  }
                  className="w-20 bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-center text-amber-400 font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-850">
                <span className="text-neutral-300">Referido que completó registro</span>
                <input
                  type="number"
                  value={scoringRules.referral_registered}
                  onChange={(e) =>
                    setScoringRules({ ...scoringRules, referral_registered: Number(e.target.value) })
                  }
                  className="w-20 bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-center text-amber-400 font-bold"
                />
              </div>
            </div>

            {rulesStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{rulesStatus}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingRules}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {savingRules ? "Guardando..." : "Guardar Reglas de Scoring"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
