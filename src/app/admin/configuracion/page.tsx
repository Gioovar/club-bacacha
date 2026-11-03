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
  MessageSquare,
  QrCode,
} from "lucide-react";
import {
  DEFAULT_WELCOME_TEMPLATE,
  renderWelcomeMessage,
} from "@/lib/members/welcome";

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

  // Welcome template state
  const [welcomeTemplate, setWelcomeTemplate] = useState(DEFAULT_WELCOME_TEMPLATE);
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [welcomeStatus, setWelcomeStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

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
        const tplConfig = data?.config?.welcome_message_template;
        if (typeof tplConfig === "string" && tplConfig.trim()) {
          setWelcomeTemplate(tplConfig);
        } else if (tplConfig && typeof tplConfig.text === "string" && tplConfig.text.trim()) {
          setWelcomeTemplate(tplConfig.text);
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

  const handleSaveWelcomeTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!welcomeTemplate.trim()) return;
    setSavingWelcome(true);
    setWelcomeStatus(null);

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          welcomeMessageTemplate: welcomeTemplate.trim(),
        }),
      });

      if (res.ok) {
        setWelcomeStatus({
          success: true,
          message:
            "Plantilla general de bienvenida guardada en Supabase. Se aplicará por defecto al abrir el modal de bienvenida.",
        });
        setTimeout(() => setWelcomeStatus(null), 4500);
      } else {
        setWelcomeStatus({
          success: false,
          message: "No se pudo guardar la plantilla general.",
        });
      }
    } catch {
      setWelcomeStatus({
        success: false,
        message: "Error de conexión al guardar la plantilla.",
      });
    } finally {
      setSavingWelcome(false);
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

      {/* General Welcome Message Template Section */}
      <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wide">
                PLANTILLA GENERAL DE BIENVENIDA Y CREDENCIAL DIGITAL
              </h2>
              <p className="text-[0.68rem] font-mono text-neutral-400 mt-0.5">
                Este texto se precarga al presionar &quot;Enviar bienvenida&quot; en el directorio de miembros. Las ediciones individuales para un socio no alteran esta plantilla general.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setWelcomeTemplate(DEFAULT_WELCOME_TEMPLATE)}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-mono flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Restaurar Predeterminado</span>
          </button>
        </div>

        <form onSubmit={handleSaveWelcomeTemplate} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase">
                Editor de Plantilla General
              </label>
              <div className="flex items-center gap-1.5 text-[0.65rem] font-mono">
                <span className="text-neutral-500">Variables dinámicas:</span>
                <button
                  type="button"
                  onClick={() => setWelcomeTemplate((prev) => `${prev} {nombre}`)}
                  className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300 hover:bg-amber-400/20"
                >
                  &#123;nombre&#125;
                </button>
                <button
                  type="button"
                  onClick={() => setWelcomeTemplate((prev) => `${prev} {numero}`)}
                  className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300 hover:bg-amber-400/20"
                >
                  &#123;numero&#125;
                </button>
              </div>
            </div>

            <textarea
              value={welcomeTemplate}
              onChange={(e) => setWelcomeTemplate(e.target.value)}
              rows={9}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-amber-400"
              required
            />

            {welcomeStatus && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  welcomeStatus.success
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/60 border-red-500/40 text-red-300"
                }`}
              >
                {welcomeStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{welcomeStatus.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingWelcome || !welcomeTemplate.trim()}
              className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {savingWelcome ? "Guardando Plantilla..." : "Guardar Plantilla General"}
              </span>
            </button>
          </div>

          <div className="space-y-2">
            <span className="block text-[0.68rem] font-mono text-neutral-400 uppercase">
              Vista Previa con Datos Reales (Ejemplo Socio #000049)
            </span>
            <div className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-850 text-xs font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed min-h-[210px]">
              {renderWelcomeMessage(welcomeTemplate, {
                first_name: "Laura",
                last_name: "Chavez",
                member_number: "000049",
              })}
            </div>
            <p className="text-[0.65rem] font-mono text-neutral-500">
              &#123;nombre&#125; se sustituye automáticamente por el nombre real del miembro y &#123;numero&#125; por su número oficial con formato #000049.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
