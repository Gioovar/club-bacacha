"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { GATE_EVENT } from "@/lib/motion";

/**
 * 18+ Age Verification Gate.
 * Full-screen modal on first visit.
 * Retains brand aesthetic (deep black, film grain, luxury minimalism).
 * Stores confirmation in localStorage ('bch_age_ok' = '1') so it doesn't prompt again.
 */
export function AgeGate() {
  const [isOpen, setIsOpen] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    // Check if already accepted
    const isOk = localStorage.getItem("bch_age_ok") === "1";
    if (!isOk) {
      setIsOpen(true);
    }
  }, []);

  const handleConfirm = () => {
    try {
      localStorage.setItem("bch_age_ok", "1");
      document.documentElement.classList.add("gate-ok");
      window.dispatchEvent(new CustomEvent(GATE_EVENT));
    } catch {
      // ignore
    }
    setIsOpen(false);
  };

  const handleReject = () => {
    setDenied(true);
  };

  if (!isOpen) return null;

  return (
    <div
      data-age-gate
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] bg-ink flex items-center justify-center p-6 text-center select-none"
    >
      {/* Background subtle noise/gradient */}
      <div className="absolute inset-0 bg-radial from-graphite/40 to-ink pointer-events-none" />

      <div className="relative z-10 max-w-md w-full flex flex-col items-center">
        {/* Brand */}
        <div className="mb-10">
          <BrandLogo size="lg" />
          <p className="eyebrow mt-3 text-ash">Acceso Exclusivo</p>
        </div>

        {!denied ? (
          <>
            <h2
              id="age-gate-title"
              className="display text-3xl sm:text-4xl text-bone mb-4 tracking-tight"
            >
              ¿ERES MAYOR DE EDAD?
            </h2>
            <p className="text-sm text-fog max-w-xs mb-10 leading-relaxed">
              El contenido y las experiencias de Club Bacachá están reservados
              exclusivamente para mayores de 18 años.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button
                type="button"
                onClick={handleConfirm}
                className="btn btn-primary flex-1 !min-h-[3.75rem] text-sm tracking-[0.25em]"
              >
                SÍ, ENTRAR
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="btn btn-ghost flex-1 !min-h-[3.75rem] text-sm tracking-[0.25em]"
              >
                NO
              </button>
            </div>

            <p className="text-[0.65rem] text-ash/60 uppercase tracking-widest mt-8">
              Evite el exceso · Válido en México (+18)
            </p>
          </>
        ) : (
          <div className="py-6">
            <h3 className="display text-2xl text-bone mb-3">ACCESO RESTRINGIDO</h3>
            <p className="text-sm text-fog leading-relaxed mb-6">
              Debes tener al menos 18 años para entrar al Club Bacachá y formar
              parte de nuestras experiencias.
            </p>
            <button
              type="button"
              onClick={() => setDenied(false)}
              className="text-xs tracking-widest uppercase text-ash underline hover:text-bone"
            >
              Volver a intentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
