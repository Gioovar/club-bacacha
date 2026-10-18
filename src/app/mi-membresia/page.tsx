"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/navigation/Header";
import { Footer } from "@/components/navigation/Footer";
import { MemberCard } from "@/components/member/MemberCard";
import { loadMember, saveMember, clearMember } from "@/lib/members/client-store";
import type { PublicMember } from "@/lib/members/types";
import { referralUrl } from "@/lib/site";
import { demoContent } from "@/lib/content/demo";

export default function MiMembresiaPage() {
  const [member, setMember] = useState<PublicMember | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Private profile state (birth date & relationship status)
  const [profile, setProfile] = useState<{
    birthDate: string | null;
    relationshipStatus: string;
    city?: string;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Birthday completion sub-state
  const [bDay, setBDay] = useState("");
  const [bMonth, setBMonth] = useState("");
  const [bYear, setBYear] = useState("");
  const [savingBirthday, setSavingBirthday] = useState(false);

  // Passwordless login state
  const [emailInput, setEmailInput] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const m = loadMember();
    setMember(m);
    setLoaded(true);

    if (m?.qrToken) {
      setProfileLoading(true);
      fetch(`/api/members/profile?qrToken=${encodeURIComponent(m.qrToken)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.member) {
            setProfile({
              birthDate: data.member.birthDate,
              relationshipStatus: data.member.relationshipStatus || "PREFIERO_NO_DECIR",
              city: data.member.city,
            });
            if (data.member.birthDate) {
              const [y, m, d] = data.member.birthDate.split("-");
              setBYear(y);
              setBMonth(String(Number(m)));
              setBDay(String(Number(d)));
            }
          }
        })
        .finally(() => setProfileLoading(false));
    }
  }, []);

  const handleUpdateRelationship = async (status: string) => {
    if (!member) return;
    setProfileMsg(null);
    try {
      const res = await fetch("/api/members/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken: member.qrToken,
          relationshipStatus: status,
        }),
      });
      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, relationshipStatus: status } : null);
        setProfileMsg({ text: "Situación sentimental actualizada correctamente ✓" });
        setTimeout(() => setProfileMsg(null), 4000);
      } else {
        const err = await res.json();
        setProfileMsg({ text: err.error || "No se pudo actualizar", error: true });
      }
    } catch {
      setProfileMsg({ text: "Error de conexión", error: true });
    }
  };

  const handleSaveBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !bDay || !bMonth || !bYear) return;

    setSavingBirthday(true);
    setProfileMsg(null);

    const d = bDay.padStart(2, "0");
    const m = bMonth.padStart(2, "0");
    const iso = `${bYear}-${m}-${d}`;

    try {
      const res = await fetch("/api/members/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken: member.qrToken,
          birthDate: iso,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, birthDate: iso } : null);
        setProfileMsg({ text: "🎂 ¡Fecha de cumpleaños registrada! Celebraremos contigo en grande." });
      } else {
        setProfileMsg({ text: data.error || "Error al guardar fecha", error: true });
      }
    } catch {
      setProfileMsg({ text: "Error de conexión", error: true });
    } finally {
      setSavingBirthday(false);
    }
  };

  const handleCopy = async () => {
    if (!member) return;
    try {
      await navigator.clipboard.writeText(referralUrl(member.memberNumber));
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!emailInput) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "No se pudo enviar el código.");
      } else {
        setOtpSent(true);
      }
    } catch {
      setAuthError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!otpToken) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, token: otpToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Código incorrecto o expirado.");
      } else if (data.member) {
        saveMember(data.member);
        setMember(data.member);
      }
    } catch {
      setAuthError("Error al verificar el código.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="grain" aria-hidden="true" />

      <main className="min-h-screen pt-32 pb-24 bg-ink text-bone">
        <div className="container-x max-w-4xl mx-auto">
          {loaded && member ? (
            <div className="space-y-16">
              {/* Member Status Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-bone/10">
                <div>
                  <span className="eyebrow text-ash block mb-1">MEMBRESÍA ACTIVA</span>
                  <h1 className="display text-3xl sm:text-5xl uppercase">
                    HOLA, {member.firstName}
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-bone text-ink text-xs font-bold tracking-widest uppercase">
                    {member.tier}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearMember();
                      setMember(null);
                    }}
                    className="text-xs text-ash hover:text-bone underline tracking-widest uppercase"
                  >
                    Salir
                  </button>
                </div>
              </div>

              {/* 3D Member Card Showcase */}
              <div className="max-w-md mx-auto py-4">
                <MemberCard
                  firstName={member.firstName}
                  memberNumber={member.memberNumber}
                  since={member.since}
                  qrToken={member.qrToken}
                />
                <p className="text-[0.65rem] tracking-[0.25em] uppercase text-ash text-center mt-6">
                  Muestra tu QR en puerta o barra para validar beneficios
                </p>
              </div>

              {/* Feedback toast / notification */}
              {profileMsg && (
                <div
                  className={`p-4 rounded-xl border text-center text-xs font-mono transition-all ${
                    profileMsg.error
                      ? "bg-red-950/70 border-red-500/40 text-red-300"
                      : "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
                  }`}
                >
                  {profileMsg.text}
                </div>
              )}

              {/* Prompt to complete birth date if missing */}
              {profile && !profile.birthDate && (
                <div className="p-6 sm:p-8 bg-amber-950/20 border border-amber-500/40 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-6xl">
                    🎂
                  </div>
                  <div className="max-w-xl">
                    <span className="text-[0.65rem] font-mono tracking-[0.25em] uppercase text-amber-400 block mb-1">
                      CELEBREMOS JUNTOS
                    </span>
                    <h3 className="display text-2xl uppercase text-bone mb-2">
                      COMPLETA TU FECHA DE NACIMIENTO
                    </h3>
                    <p className="text-xs sm:text-sm text-fog font-light leading-relaxed mb-6">
                      Registra tu fecha de nacimiento (+18) para recibir botellas de cortesía, beneficios VIP y felicitaciones especiales el día de tu cumpleaños.
                    </p>

                    <form onSubmit={handleSaveBirthday} className="space-y-4">
                      <div className="grid grid-cols-3 gap-2 max-w-sm">
                        <select
                          value={bDay}
                          onChange={(e) => setBDay(e.target.value)}
                          required
                          className="field-input !px-2 text-center text-xs"
                        >
                          <option value="">Día</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={String(d)}>
                              {String(d).padStart(2, "0")}
                            </option>
                          ))}
                        </select>

                        <select
                          value={bMonth}
                          onChange={(e) => setBMonth(e.target.value)}
                          required
                          className="field-input !px-1.5 text-center text-xs"
                        >
                          <option value="">Mes</option>
                          <option value="1">01 · Ene</option>
                          <option value="2">02 · Feb</option>
                          <option value="3">03 · Mar</option>
                          <option value="4">04 · Abr</option>
                          <option value="5">05 · May</option>
                          <option value="6">06 · Jun</option>
                          <option value="7">07 · Jul</option>
                          <option value="8">08 · Ago</option>
                          <option value="9">09 · Sep</option>
                          <option value="10">10 · Oct</option>
                          <option value="11">11 · Nov</option>
                          <option value="12">12 · Dic</option>
                        </select>

                        <select
                          value={bYear}
                          onChange={(e) => setBYear(e.target.value)}
                          required
                          className="field-input !px-2 text-center text-xs"
                        >
                          <option value="">Año</option>
                          {Array.from(
                            { length: 80 },
                            (_, i) => 2008 - i
                          ).map((yr) => (
                            <option key={yr} value={String(yr)}>
                              {yr}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={savingBirthday || !bDay || !bMonth || !bYear}
                        className="btn btn-primary !min-h-[2.75rem] !px-6 text-xs tracking-widest uppercase disabled:opacity-50"
                      >
                        {savingBirthday ? "GUARDANDO..." : "GUARDAR FECHA DE CUMPLEAÑOS"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Private Profile Settings: Relationship Status & Birthday summary */}
              <div className="p-6 sm:p-8 bg-coal border border-bone/10 rounded-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-bone/10">
                  <div>
                    <span className="text-[0.62rem] font-mono tracking-widest uppercase text-ash block">
                      CONFIGURACIÓN PERSONAL
                    </span>
                    <h3 className="display text-xl uppercase text-bone">
                      TU PERFIL PRIVADO
                    </h3>
                  </div>
                  {profile?.birthDate && (
                    <div className="text-xs font-mono text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5 self-start">
                      <span>🎂 Cumpleaños: {profile.birthDate.split("-").reverse().join("/")}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-bone tracking-wider uppercase">
                      ¿CUÁL ES TU SITUACIÓN SENTIMENTAL?
                    </label>
                    <span className="text-[0.62rem] font-mono text-ash uppercase">
                      Privado en tu cuenta
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { value: "SOLTERO", label: "Soltero(a)", icon: "🍸" },
                      { value: "EN_RELACION", label: "En una relación", icon: "❤️" },
                      { value: "CASADO", label: "Casado(a)", icon: "💍" },
                      { value: "PREFIERO_NO_DECIR", label: "Prefiero no decir", icon: "🔒" },
                    ].map((opt) => {
                      const isSelected = profile?.relationshipStatus === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleUpdateRelationship(opt.value)}
                          className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                            isSelected
                              ? "bg-amber-400/15 border-amber-400 text-bone shadow-md shadow-amber-400/10 ring-1 ring-amber-400"
                              : "bg-ink/60 border-bone/10 text-fog hover:border-bone/30"
                          }`}
                        >
                          <span className="text-lg mb-1">{opt.icon}</span>
                          <span className="text-xs font-mono font-medium">
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[0.68rem] text-ash font-light">
                    Esta información es confidencial y no se exhibe en tu credencial. En cada evento podrás elegir independientemente con qué plan asistes (ligue, amigos, fiesta o privado).
                  </p>
                </div>
              </div>

              {/* Referrals & Invites */}
              <div className="p-6 sm:p-8 bg-coal border border-bone/10 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h3 className="display text-2xl uppercase mb-2">
                      INVITA A TUS AMIGOS
                    </h3>
                    <p className="text-sm text-fog font-light max-w-md">
                      Tu enlace exclusivo de invitación:
                    </p>
                    <code className="text-xs font-mono text-bone/90 bg-ink px-3 py-1.5 rounded block mt-2 max-w-sm truncate border border-bone/10">
                      {referralUrl(member.memberNumber)}
                    </code>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="btn btn-primary !min-h-[3rem] !text-xs tracking-[0.2em]"
                    >
                      {copied ? "COPIADO ✓" : "COPIAR ENLACE"}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Únete a Club Bacachá con mi invitación: ${referralUrl(
                          member.memberNumber
                        )}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost !min-h-[3rem] !text-xs tracking-[0.2em]"
                    >
                      WHATSAPP
                    </a>
                  </div>
                </div>
              </div>

              {/* Active Benefits Quick View */}
              <div>
                <h3 className="display text-2xl sm:text-3xl uppercase mb-6 pb-4 border-b border-bone/10">
                  TUS BENEFICIOS DISPONIBLES
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {demoContent.benefits.items.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      className="p-6 bg-coal border border-bone/10 flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[0.6rem] tracking-[0.3em] uppercase text-ash block mb-2">
                          EXCLUSIVO CLUB
                        </span>
                        <h4 className="display text-xl uppercase mb-2">{b.title}</h4>
                        <p className="text-xs text-fog font-light leading-relaxed">
                          {b.phrase}
                        </p>
                      </div>
                      <div className="pt-6 mt-6 border-t border-bone/10 flex justify-between items-center text-xs">
                        <span className="text-bone font-mono">ACTIVO</span>
                        <span className="text-ash tracking-widest uppercase">
                          Mostrar QR
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : loaded ? (
            /* Passwordless Member Login */
            <div className="text-center py-16 max-w-md mx-auto space-y-8">
              <div>
                <span className="eyebrow text-ash block mb-2">ACCESO A MIEMBROS</span>
                <h1 className="display text-3xl sm:text-5xl uppercase">
                  INGRESAR A MI MEMBRESÍA
                </h1>
                <p className="text-sm text-fog font-light mt-3 leading-relaxed">
                  Ingresa con tu correo. Sin contraseñas: te enviamos un código o
                  enlace seguro de acceso inmediato.
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs">
                  {authError}
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-6 text-left">
                  <div className="field">
                    <label htmlFor="login-email" className="field-label">
                      CORREO ELECTRÓNICO REGISTRADO
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="tu@correo.com"
                      className="field-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full !min-h-[3.5rem] text-xs tracking-[0.25em]"
                  >
                    {loading ? "ENVIANDO..." : "ENVIAR CÓDIGO / LINK"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6 text-left">
                  <div className="field">
                    <label htmlFor="login-otp" className="field-label">
                      CÓDIGO DE 6 DÍGITOS
                    </label>
                    <input
                      id="login-otp"
                      type="text"
                      maxLength={8}
                      required
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value)}
                      placeholder="123456"
                      className="field-input text-center tracking-[0.5em] text-2xl font-mono"
                    />
                    <p className="text-[0.7rem] text-ash font-mono mt-2">
                      Enviamos el código a: {emailInput}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary w-full !min-h-[3.5rem] text-xs tracking-[0.25em]"
                    >
                      {loading ? "VERIFICANDO..." : "VERIFICAR Y ENTRAR"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-ash tracking-wider uppercase underline w-full text-center block pt-2"
                    >
                      Cambiar correo
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-8 border-t border-bone/10 space-y-4">
                <p className="text-xs text-ash uppercase tracking-wider">
                  ¿Aún no eres miembro de Club Bacachá?
                </p>
                <Link
                  href="/#unete"
                  className="btn btn-ghost w-full !min-h-[3.25rem] text-xs tracking-[0.2em]"
                >
                  REGISTRARME AL CLUB
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-32 text-center text-ash animate-pulse font-mono text-xs">
              CARGANDO CREDENCIAL...
            </div>
          )}
        </div>
      </main>

      <Footer
        social={demoContent.social}
        contactEmail={demoContent.contactEmail}
      />
    </>
  );
}
