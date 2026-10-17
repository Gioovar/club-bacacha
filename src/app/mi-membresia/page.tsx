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
  }, []);

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
