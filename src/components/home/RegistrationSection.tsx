"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { registrationSchema, type RegistrationInput } from "@/lib/members/schema";
import { getAttribution } from "@/lib/tracking/attribution";
import { saveMember } from "@/lib/members/client-store";
import type { PublicMember } from "@/lib/members/types";
import { MemberConfirmation } from "@/components/home/MemberConfirmation";
import { RevealLines } from "@/components/motion/RevealLines";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  eyebrow: string;
  titleLines: string[];
  body: string;
};

/**
 * Registration Form Section.
 * Ultra-streamlined onboarding:
 * - NO password requested
 * - Fields: Nombre, Apellido, Fecha nacimiento (+18 check), WhatsApp, Correo, Ciudad, Instagram (opcional)
 * - Required: Aviso de Privacidad
 * - Independent: Consentimiento de comunicaciones (WhatsApp, Correo, etc.) NOT pre-checked
 * - On success: Displays MemberConfirmation with member number and card
 */
export function RegistrationSection({ eyebrow, titleLines, body }: Props) {
  const [formData, setFormData] = useState<RegistrationInput>({
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    email: "",
    city: "",
    relationshipStatus: "PREFIERO_NO_DECIR",
    instagram: "",
    acceptPrivacy: true as unknown as true, // will be bound to checkbox
    acceptMarketing: false, // NOT pre-checked by design rule
  });

  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [registeredMember, setRegisteredMember] = useState<PublicMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sync 3-part birthdate to formData.birthDate and validate in real-time
  useEffect(() => {
    if (birthDay && birthMonth && birthYear) {
      const d = birthDay.padStart(2, "0");
      const m = birthMonth.padStart(2, "0");
      const y = birthYear;
      const iso = `${y}-${m}-${d}`;
      
      const birthDateObj = new Date(`${y}-${m}-${d}T00:00:00`);
      const now = new Date();
      let age = now.getFullYear() - Number(y);
      const mDiff = now.getMonth() + 1 - Number(m);
      if (mDiff < 0 || (mDiff === 0 && now.getDate() < Number(d))) {
        age--;
      }

      const isValidDate =
        birthDateObj.getFullYear() === Number(y) &&
        birthDateObj.getMonth() + 1 === Number(m) &&
        birthDateObj.getDate() === Number(d);

      if (!isValidDate) {
        setCalculatedAge(null);
        setFieldErrors((prev) => ({ ...prev, birthDate: "Fecha no válida en el calendario" }));
        return;
      }

      if (birthDateObj > now) {
        setCalculatedAge(null);
        setFieldErrors((prev) => ({ ...prev, birthDate: "No se permiten fechas futuras" }));
        return;
      }

      setCalculatedAge(age);
      if (age < 18) {
        setFieldErrors((prev) => ({ ...prev, birthDate: "Debes ser mayor de 18 años para entrar al Club" }));
      } else {
        setFieldErrors((prev) => ({ ...prev, birthDate: "" }));
      }

      setFormData((prev) => ({ ...prev, birthDate: iso }));
    }
  }, [birthDay, birthMonth, birthYear]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    if (!privacyAccepted) {
      setFieldErrors((prev) => ({
        ...prev,
        acceptPrivacy: "Debes aceptar el Aviso de Privacidad",
      }));
      return;
    }

    const payload: RegistrationInput = {
      ...formData,
      acceptPrivacy: privacyAccepted as true,
      acceptMarketing: marketingAccepted,
      attribution: getAttribution(),
    };

    const parsed = registrationSchema.safeParse(payload);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !errMap[field]) {
          errMap[field] = issue.message;
        }
      });
      setFieldErrors(errMap);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          const flat: Record<string, string> = {};
          Object.keys(data.fieldErrors).forEach((k) => {
            flat[k] = data.fieldErrors[k][0] || "Dato inválido";
          });
          setFieldErrors(flat);
        } else {
          setErrorMsg(data.error || "Ocurrió un error al procesar tu registro.");
        }
        setLoading(false);
        return;
      }

      // Successful registration
      const member = data.member as PublicMember;
      saveMember(member);
      setRegisteredMember(member);
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de conexión. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="unete" className="py-24 sm:py-36 bg-ink border-t border-bone/5">
      <div className="container-x max-w-3xl">
        {registeredMember ? (
          <MemberConfirmation
            member={registeredMember}
            onReset={() => {
              setRegisteredMember(null);
              setFormData({
                firstName: "",
                lastName: "",
                birthDate: "",
                phone: "",
                email: "",
                city: "",
                relationshipStatus: "PREFIERO_NO_DECIR",
                instagram: "",
                acceptPrivacy: true as unknown as true,
                acceptMarketing: false,
              });
              setBirthDay("");
              setBirthMonth("");
              setBirthYear("");
              setCalculatedAge(null);
              setPrivacyAccepted(false);
              setMarketingAccepted(false);
            }}
          />
        ) : (
          <div>
            {/* Header */}
            <div className="text-center max-w-xl mx-auto mb-16">
              <Reveal>
                <p className="eyebrow mb-4 text-ash">{eyebrow}</p>
              </Reveal>
              <RevealLines
                lines={titleLines}
                as="h2"
                className="display t-lg text-bone tracking-tight mb-4"
              />
              <Reveal delay={0.2}>
                <p className="text-base text-fog font-light leading-relaxed">
                  {body}
                </p>
              </Reveal>
            </div>

            {errorMsg && (
              <div className="mb-8 p-4 bg-red-950/40 border border-red-500/30 text-red-200 text-sm text-center">
                {errorMsg}
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Row 1: Nombre & Apellido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="field">
                  <label htmlFor="reg-name" className="field-label">
                    NOMBRE *
                  </label>
                  <input
                    id="reg-name"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Giovanni"
                    className="field-input"
                    aria-invalid={Boolean(fieldErrors.firstName)}
                  />
                  {fieldErrors.firstName && (
                    <p className="field-error">{fieldErrors.firstName}</p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="reg-lastname" className="field-label">
                    APELLIDO *
                  </label>
                  <input
                    id="reg-lastname"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Vargas"
                    className="field-input"
                    aria-invalid={Boolean(fieldErrors.lastName)}
                  />
                  {fieldErrors.lastName && (
                    <p className="field-error">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Fecha Nacimiento (Selector móvil 3 campos) & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="field">
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label !mb-0">
                      FECHA DE NACIMIENTO (+18) *
                    </label>
                    {calculatedAge !== null && calculatedAge >= 18 && (
                      <span className="text-[0.68rem] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                        {calculatedAge} AÑOS ✓
                      </span>
                    )}
                  </div>

                  {/* 3-part comfortable mobile selector: Día, Mes, Año */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <select
                        id="reg-birth-day"
                        value={birthDay}
                        onChange={(e) => setBirthDay(e.target.value)}
                        required
                        className="field-input !px-2 text-center"
                        aria-label="Día de nacimiento"
                      >
                        <option value="">Día</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={String(d)}>
                            {String(d).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <select
                        id="reg-birth-month"
                        value={birthMonth}
                        onChange={(e) => setBirthMonth(e.target.value)}
                        required
                        className="field-input !px-1.5 text-center text-xs"
                        aria-label="Mes de nacimiento"
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
                    </div>

                    <div>
                      <select
                        id="reg-birth-year"
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        required
                        className="field-input !px-2 text-center"
                        aria-label="Año de nacimiento"
                      >
                        <option value="">Año</option>
                        {Array.from(
                          { length: 85 },
                          (_, i) => 2008 - i
                        ).map((yr) => (
                          <option key={yr} value={String(yr)}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <input
                    type="hidden"
                    name="birthDate"
                    value={formData.birthDate}
                  />

                  {fieldErrors.birthDate && (
                    <p className="field-error mt-1.5">{fieldErrors.birthDate}</p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="reg-phone" className="field-label">
                    WHATSAPP / TELÉFONO (10 DÍGITOS) *
                  </label>
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="7441234567"
                    className="field-input"
                    aria-invalid={Boolean(fieldErrors.phone)}
                  />
                  {fieldErrors.phone && (
                    <p className="field-error">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Row 3: Correo & Ciudad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="field">
                  <label htmlFor="reg-email" className="field-label">
                    CORREO ELECTRÓNICO *
                  </label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="tu@correo.com"
                    className="field-input"
                    aria-invalid={Boolean(fieldErrors.email)}
                  />
                  {fieldErrors.email && (
                    <p className="field-error">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="reg-city" className="field-label">
                    CIUDAD *
                  </label>
                  <input
                    id="reg-city"
                    name="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Acapulco, CDMX, etc."
                    className="field-input"
                    aria-invalid={Boolean(fieldErrors.city)}
                  />
                  {fieldErrors.city && (
                    <p className="field-error">{fieldErrors.city}</p>
                  )}
                </div>
              </div>

              {/* Row 4: Situación Sentimental (Opcional) */}
              <div className="field">
                <div className="flex items-center justify-between mb-2">
                  <label className="field-label !mb-0">
                    ¿CUÁL ES TU SITUACIÓN SENTIMENTAL? (OPCIONAL)
                  </label>
                  <span className="text-[0.62rem] font-mono text-ash/80 uppercase">
                    Privado en tu perfil
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { value: "SOLTERO", label: "Soltero(a)", icon: "🍸" },
                    { value: "EN_RELACION", label: "En una relación", icon: "❤️" },
                    { value: "CASADO", label: "Casado(a)", icon: "💍" },
                    { value: "PREFIERO_NO_DECIR", label: "Prefiero no decir", icon: "🔒" },
                  ].map((opt) => {
                    const isSelected = formData.relationshipStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            relationshipStatus: opt.value as any,
                          }))
                        }
                        className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? "bg-amber-400/10 border-amber-400 text-bone shadow-md shadow-amber-400/10"
                            : "bg-coal/60 border-bone/10 text-fog hover:border-bone/30"
                        }`}
                      >
                        <span className="text-base mb-1">{opt.icon}</span>
                        <span className="text-xs font-mono font-medium tracking-tight">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[0.68rem] text-ash font-light mt-2">
                  Esta información es confidencial y no se exhibe públicamente. En cada evento podrás elegir independientemente en qué plan asistes.
                </p>
              </div>

              {/* Row 5: Instagram (Opcional) */}
              <div className="field">
                <label htmlFor="reg-ig" className="field-label">
                  INSTAGRAM (OPCIONAL)
                </label>
                <input
                  id="reg-ig"
                  name="instagram"
                  type="text"
                  value={formData.instagram}
                  onChange={handleChange}
                  placeholder="@usuario"
                  className="field-input"
                  aria-invalid={Boolean(fieldErrors.instagram)}
                />
                {fieldErrors.instagram && (
                  <p className="field-error">{fieldErrors.instagram}</p>
                )}
              </div>

              {/* Checkboxes */}
              <div className="space-y-4 pt-4 border-t border-bone/10">
                {/* Mandatory Privacy Checkbox */}
                <div>
                  <label className="check">
                    <input
                      type="checkbox"
                      required
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    />
                    <span>
                      Acepto el{" "}
                      <Link
                        href="/aviso-privacidad"
                        target="_blank"
                        className="text-bone underline hover:text-white"
                      >
                        Aviso de Privacidad
                      </Link>{" "}
                      y confirmo que soy mayor de edad. *
                    </span>
                  </label>
                  {fieldErrors.acceptPrivacy && (
                    <p className="field-error pl-8">
                      {fieldErrors.acceptPrivacy}
                    </p>
                  )}
                </div>

                {/* Independent Marketing Consent Checkbox (NOT auto-checked) */}
                <div>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={marketingAccepted}
                      onChange={(e) => setMarketingAccepted(e.target.checked)}
                    />
                    <span>
                      Acepto recibir promociones, invitaciones, novedades y
                      beneficios de Club Bacachá por WhatsApp, correo electrónico
                      y otros medios digitales.
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full !min-h-[4rem] text-sm tracking-[0.25em]"
                >
                  {loading ? "PROCESANDO ACCESO..." : "UNIRME AL CLUB"}
                </button>
                <p className="text-[0.65rem] tracking-[0.25em] uppercase text-ash/60 text-center mt-4">
                  Acceso exclusivo · Confirmación inmediata de número de miembro
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
