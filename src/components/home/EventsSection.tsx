"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ClubEvent } from "@/lib/content/types";
import { formatEventDate } from "@/lib/site";
import { RevealLines } from "@/components/motion/RevealLines";
import { Reveal } from "@/components/motion/Reveal";
import { loadMember } from "@/lib/members/client-store";
import type { PublicMember } from "@/lib/members/types";
import { CheckCircle2, Sparkles, X, Heart, Users, Flame, Lock } from "lucide-react";

type Props = {
  eyebrow: string;
  titleLines: string[];
  items: ClubEvent[];
};

export const SOCIAL_PLAN_DETAILS = {
  EN_PAREJA: {
    emoji: "🔴",
    title: "ESTOY CON PAREJA",
    description: "Vengo con mi pareja a disfrutar la noche",
    wristband: "Pulsera Roja",
    colorClass: "bg-red-950/80 border-red-500 text-red-200",
    badgeBg: "bg-red-500 text-white font-bold",
  },
  HACER_AMIGOS: {
    emoji: "🟡",
    title: "VENGO A HACER AMIGOS",
    description: "Quiero conocer gente nueva y ampliar mi círculo",
    wristband: "Pulsera Amarilla",
    colorClass: "bg-amber-950/80 border-amber-400 text-amber-200",
    badgeBg: "bg-amber-400 text-black font-bold",
  },
  PLAN_LIGUE: {
    emoji: "🟢",
    title: "EN BUSCA DE PAREJA",
    description: "Me gustaría conocer a alguien especial / plan ligue",
    wristband: "Pulsera Verde",
    colorClass: "bg-emerald-950/80 border-emerald-400 text-emerald-200",
    badgeBg: "bg-emerald-400 text-black font-bold",
  },
} as const;

export type SocialPlanKey = keyof typeof SOCIAL_PLAN_DETAILS;

export function EventsSection({ eyebrow, titleLines, items }: Props) {
  const [member, setMember] = useState<PublicMember | null>(null);

  // RSVP Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SocialPlanKey>("HACER_AMIGOS");
  const [identifierInput, setIdentifierInput] = useState("");
  const [loadingRegistration, setLoadingRegistration] = useState(false);
  const [hasBirthDate, setHasBirthDate] = useState(true);

  // Missing birthdate state
  const [bDay, setBDay] = useState("");
  const [bMonth, setBMonth] = useState("");
  const [bYear, setBYear] = useState("");

  const [rsvpSuccess, setRsvpSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const m = loadMember();
    setMember(m);
  }, []);

  const openRsvpModal = async (event: ClubEvent) => {
    setSelectedEvent(event);
    setErrorMessage(null);
    setRsvpSuccess(false);
    setModalOpen(true);

    if (member?.qrToken) {
      try {
        const res = await fetch(
          `/api/events/register?eventId=${encodeURIComponent(event.id)}&qrToken=${encodeURIComponent(
            member.qrToken
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.socialPlan && data.socialPlan in SOCIAL_PLAN_DETAILS) {
            setSelectedPlan(data.socialPlan as SocialPlanKey);
          }
          if (data.hasBirthDate !== undefined) {
            setHasBirthDate(data.hasBirthDate);
          }
        }
      } catch {
        // ignore fallback
      }
    }
  };

  const handleConfirmRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setErrorMessage(null);
    setLoadingRegistration(true);

    try {
      const payload: any = {
        eventId: selectedEvent.id,
        socialPlan: selectedPlan,
      };

      if (member?.qrToken) {
        payload.qrToken = member.qrToken;
      } else if (identifierInput.trim()) {
        const val = identifierInput.trim();
        if (val.includes("@")) {
          payload.email = val;
        } else if (val.startsWith("#") || !isNaN(Number(val))) {
          payload.memberNumber = val.replace("#", "");
        } else {
          payload.phone = val;
        }
      } else {
        setErrorMessage("Por favor ingresa tu número de miembro o afíliate.");
        setLoadingRegistration(false);
        return;
      }

      // If user needed to complete birth date
      if (!hasBirthDate && bDay && bMonth && bYear) {
        payload.birthDate = `${bYear}-${bMonth.padStart(2, "0")}-${bDay.padStart(2, "0")}`;
      }

      const res = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRsvpSuccess(true);
      } else {
        setErrorMessage(data.error || "Ocurrió un error al confirmar tu asistencia.");
      }
    } catch {
      setErrorMessage("Error de conexión. Inténtalo nuevamente.");
    } finally {
      setLoadingRegistration(false);
    }
  };

  return (
    <section id="eventos" className="py-24 sm:py-36 bg-coal border-t border-bone/5">
      <div className="container-x">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16 sm:mb-24">
          <div>
            <Reveal>
              <p className="eyebrow mb-4 text-ash">{eyebrow}</p>
            </Reveal>
            <RevealLines
              lines={titleLines}
              as="h2"
              className="display t-lg text-bone tracking-tight"
            />
          </div>

          <Reveal delay={0.2}>
            <p className="text-sm text-ash max-w-xs font-light">
              Acceso prioritario y dinámica del semáforo exclusiva para miembros del Club.
            </p>
          </Reveal>
        </div>

        {/* Events Layout */}
        <div className={items.length === 1 ? "max-w-3xl mx-auto" : "grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12"}>
          {items.map((event) => {
            const date = formatEventDate(event.date);
            return (
              <div
                key={event.id}
                className="group flex flex-col justify-between bg-ink border border-bone/15 rounded-xl overflow-hidden shadow-2xl"
              >
                {/* Visual Media Container */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-graphite">
                  <Image
                    src={event.image.src}
                    alt={event.image.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 768px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />

                  {/* Badge: Members Only */}
                  {event.membersOnly && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-ink/80 backdrop-blur-sm border border-bone/20 text-[0.6rem] tracking-[0.25em] uppercase text-bone">
                      SÓLO MIEMBROS
                    </div>
                  )}

                  {/* Date Badge */}
                  <div className="absolute top-4 right-4 bg-bone text-ink p-3 text-center min-w-[3.5rem] flex flex-col justify-center shadow-lg">
                    <span className="display text-2xl leading-none font-bold">
                      {date.day}
                    </span>
                    <span className="text-[0.6rem] tracking-wider uppercase font-semibold">
                      {date.month}
                    </span>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-6 sm:p-8 flex flex-col flex-grow justify-between">
                  <div>
                    <div className="flex items-center gap-4 text-xs font-mono text-ash tracking-wider mb-2">
                      <span>{date.weekday}</span>
                      <span>•</span>
                      <span>{event.time} HRS</span>
                      <span>•</span>
                      <span>{event.city}</span>
                    </div>

                    <h3 className="display text-2xl sm:text-3xl text-bone mb-3 tracking-tight uppercase group-hover:text-white transition-colors">
                      {event.name}
                    </h3>

                    <p className="text-sm text-fog font-light leading-relaxed mb-5">
                      {event.description}
                    </p>

                    {/* Confirmed Event Perks */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="px-2.5 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[0.65rem] font-mono uppercase tracking-wider rounded">
                        🍾 BOTELLAS $599
                      </span>
                      <span className="px-2.5 py-1 bg-bone/10 border border-bone/20 text-bone text-[0.65rem] font-mono uppercase tracking-wider rounded">
                        🍹 MOJITOS 2X1
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-[0.65rem] font-mono uppercase tracking-wider rounded">
                        🚦 DINÁMICA DEL SEMÁFORO
                      </span>
                    </div>

                    <p className="text-xs text-ash tracking-wider uppercase font-mono mb-6">
                      📍 {event.venue}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 pt-4 border-t border-bone/10">
                    <button
                      type="button"
                      onClick={() => openRsvpModal(event)}
                      className="btn btn-primary flex-1 !min-h-[3rem] !text-xs tracking-[0.2em]"
                    >
                      CONFIRMAR PLAN
                    </button>
                    <a
                      href="#unete"
                      className="btn btn-ghost flex-1 !min-h-[3rem] !text-xs tracking-[0.2em]"
                    >
                      UNIRME AL CLUB
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SOCIAL DYNAMIC RSVP MODAL */}
      {modalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-coal border border-bone/20 rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-ash hover:text-white transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <span className="eyebrow text-ash block mb-1">
                DINÁMICA SOCIAL DEL SEMÁFORO · {selectedEvent.name}
              </span>
              <h3 className="display text-2xl sm:text-3xl uppercase text-bone tracking-tight">
                ¿EN QUÉ PLAN VIENES HOY?
              </h3>
              <p className="text-xs text-fog font-light mt-1.5 leading-relaxed">
                Elige la vibra con la que asistes a esta fecha. Te entregaremos tu pulsera distintiva en puerta para romper el hielo y conectar con la comunidad.
              </p>
            </div>

            {/* Introductory Privacy Notice */}
            <div className="p-4 bg-ink/90 border border-bone/15 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-bone">
                <span>🔒</span>
                <span>PRIVACIDAD & SITUACIÓN SENTIMENTAL</span>
              </div>
              <p className="text-xs text-ash font-light leading-relaxed">
                Tu situación sentimental en tu perfil personal es <strong>estrictamente confidencial</strong>. Esta elección es exclusiva para identificarte con tu pulsera en la puerta de este evento y facilitar la dinámica social.
              </p>
            </div>

            {rsvpSuccess ? (
              /* Success Screen */
              <div className="p-6 bg-ink border border-bone/20 rounded-xl text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-2xl">
                  ✓
                </div>

                <div>
                  <h4 className="display text-xl text-bone uppercase mb-1">
                    ¡ASISTENCIA CONFIRMADA!
                  </h4>
                  <p className="text-xs text-fog font-light">
                    Tu acceso para <strong>{selectedEvent.name}</strong> ha quedado registrado.
                  </p>
                </div>

                {/* Badge summary */}
                <div
                  className={`p-4 rounded-xl border text-left space-y-2 ${SOCIAL_PLAN_DETAILS[selectedPlan].colorClass}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm font-mono flex items-center gap-1.5">
                      <span>{SOCIAL_PLAN_DETAILS[selectedPlan].emoji}</span>
                      <span>{SOCIAL_PLAN_DETAILS[selectedPlan].title}</span>
                    </span>
                    <span
                      className={`text-[0.62rem] font-bold px-2 py-0.5 rounded uppercase ${SOCIAL_PLAN_DETAILS[selectedPlan].badgeBg}`}
                    >
                      {SOCIAL_PLAN_DETAILS[selectedPlan].wristband}
                    </span>
                  </div>
                  <p className="text-xs font-light">
                    "{SOCIAL_PLAN_DETAILS[selectedPlan].description}"
                  </p>
                  <p className="text-[0.65rem] font-mono text-ash pt-1 border-t border-bone/10">
                    Muestra tu QR digital en puerta para recibir tu distintivo oficial.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/mi-membresia"
                    className="btn btn-primary flex-1 !min-h-[2.75rem] !text-xs tracking-wider"
                  >
                    VER MI CREDENCIAL
                  </Link>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn btn-ghost flex-1 !min-h-[2.75rem] !text-xs tracking-wider"
                  >
                    CERRAR
                  </button>
                </div>
              </div>
            ) : (
              /* Selection Form */
              <form onSubmit={handleConfirmRsvp} className="space-y-5">
                {/* 3 Official Traffic Light Plan Cards */}
                <div className="space-y-2.5">
                  {(Object.keys(SOCIAL_PLAN_DETAILS) as SocialPlanKey[]).map((key) => {
                    const plan = SOCIAL_PLAN_DETAILS[key];
                    const isSelected = selectedPlan === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedPlan(key)}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? `${plan.colorClass} ring-2 ring-bone/30 shadow-lg scale-[1.01]`
                            : "bg-ink/60 border-bone/10 text-fog hover:border-bone/25 hover:bg-ink"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{plan.emoji}</span>
                            <span className="font-mono text-xs font-bold tracking-wider text-bone uppercase">
                              {plan.title}
                            </span>
                          </div>
                          <p className="text-xs font-light text-fog leading-relaxed">
                            "{plan.description}"
                          </p>
                        </div>

                        <span
                          className={`text-[0.62rem] font-mono px-2 py-0.5 rounded uppercase shrink-0 mt-0.5 ${
                            isSelected ? plan.badgeBg : "bg-bone/10 text-ash"
                          }`}
                        >
                          {plan.wristband}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Privacy clarification note */}
                <div className="p-3 bg-ink/70 border border-bone/10 rounded-xl text-[0.68rem] text-ash font-light leading-relaxed">
                  🔒 <strong>Esta dinámica es exclusiva para este evento.</strong> No sobrescribe la situación sentimental de tu perfil privado. Puedes cambiar tu elección en cualquier momento antes o durante el check-in.
                </div>

                {/* If member is not recognized in localStorage */}
                {!member && (
                  <div className="space-y-2 pt-2 border-t border-bone/10">
                    <label className="field-label !mb-0 text-xs">
                      TU NÚMERO DE SOCIO O WHATSAPP *
                    </label>
                    <input
                      type="text"
                      required
                      value={identifierInput}
                      onChange={(e) => setIdentifierInput(e.target.value)}
                      placeholder="Ej: #000128 o 7441234567"
                      className="field-input"
                    />
                    <p className="text-[0.65rem] text-ash">
                      ¿Aún no eres miembro?{" "}
                      <a href="#unete" onClick={() => setModalOpen(false)} className="text-bone underline">
                        Afíliate gratis aquí en 1 minuto
                      </a>.
                    </p>
                  </div>
                )}

                {/* If member has no birth date, prompt to complete */}
                {!hasBirthDate && (
                  <div className="p-4 bg-amber-950/20 border border-amber-500/40 rounded-xl space-y-2">
                    <span className="text-[0.62rem] font-mono text-amber-400 uppercase tracking-widest block">
                      COMPLETA TU PERFIL (+18)
                    </span>
                    <p className="text-xs text-fog">
                      Registra tu fecha de nacimiento para recibir tus beneficios de cumpleaños y confirmar acceso:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
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
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-mono text-center rounded-xl">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loadingRegistration}
                  className="btn btn-primary w-full !min-h-[3.25rem] !text-xs tracking-[0.25em] uppercase font-bold disabled:opacity-50"
                >
                  {loadingRegistration ? "CONFIRMANDO..." : "CONFIRMAR ASISTENCIA AL EVENTO"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
