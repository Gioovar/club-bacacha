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
    instagram: "",
    acceptPrivacy: true as unknown as true, // will be bound to checkbox
    acceptMarketing: false, // NOT pre-checked by design rule
  });

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [registeredMember, setRegisteredMember] = useState<PublicMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
                instagram: "",
                acceptPrivacy: true as unknown as true,
                acceptMarketing: false,
              });
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

              {/* Row 2: Fecha Nacimiento & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="field">
                  <label htmlFor="reg-birth" className="field-label">
                    FECHA DE NACIMIENTO (+18) *
                  </label>
                  <input
                    id="reg-birth"
                    name="birthDate"
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={handleChange}
                    className="field-input"
                    aria-invalid={Boolean(fieldErrors.birthDate)}
                  />
                  {fieldErrors.birthDate && (
                    <p className="field-error">{fieldErrors.birthDate}</p>
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

              {/* Row 4: Instagram (Opcional) */}
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
