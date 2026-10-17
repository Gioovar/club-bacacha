"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MemberCard } from "@/components/member/MemberCard";
import type { PublicMember } from "@/lib/members/types";
import { formatMemberNumber, referralUrl } from "@/lib/site";

type Props = {
  member: PublicMember;
  onReset?: () => void;
};

/**
 * Registration Confirmation Experience.
 * NOT "Gracias por registrarte".
 * "YA ESTÁS DENTRO. BIENVENIDO AL CLUB BACACHÁ."
 * Immediate presentation of digital member card, WhatsApp invite share, copy link, and quick actions.
 */
export function MemberConfirmation({ member, onReset }: Props) {
  const [copied, setCopied] = useState(false);
  const refLink = referralUrl(member.memberNumber);
  const formattedNumber = formatMemberNumber(member.memberNumber);

  const shareText = `Ya soy parte de Club Bacachá. Únete aquí: ${refLink}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(refLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="relative py-12 sm:py-16 bg-ink text-center max-w-2xl mx-auto">
      {/* Editorial Welcome Header */}
      <div className="mb-10 sm:mb-12">
        <span className="eyebrow text-ash block mb-3">ACCESO CONCEDIDO</span>
        <h2 className="display text-4xl sm:text-6xl text-bone mb-3 tracking-tight">
          YA ESTÁS DENTRO.
        </h2>
        <p className="display text-xl sm:text-2xl text-bone/80 tracking-widest uppercase">
          BIENVENIDO AL CLUB BACACHÁ.
        </p>
        <p className="text-sm font-mono text-ash tracking-widest mt-4">
          TU NÚMERO DE MIEMBRO: #{formattedNumber}
        </p>
      </div>

      {/* Hero Member Card Presentation */}
      <div className="mb-12">
        <MemberCard
          firstName={member.firstName}
          memberNumber={member.memberNumber}
          since={member.since}
          qrToken={member.qrToken}
        />
        <p className="text-[0.65rem] tracking-[0.28em] uppercase text-ash mt-4">
          Credencial digital oficial · Club Bacachá
        </p>
      </div>

      {/* Share / Referrals Block */}
      <div className="bg-coal border border-bone/10 p-6 sm:p-8 rounded-xl mb-10 text-left">
        <h3 className="display text-xl sm:text-2xl text-bone mb-2 uppercase">
          INVITA A TUS AMIGOS
        </h3>
        <p className="text-sm text-fog font-light leading-relaxed mb-6">
          Comparte tu enlace exclusivo. Los miembros que invites quedarán
          registrados bajo tu número de miembro.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary flex-1 !min-h-[3.25rem] !text-xs tracking-[0.2em]"
          >
            COMPARTIR POR WHATSAPP
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-ghost flex-1 !min-h-[3.25rem] !text-xs tracking-[0.2em]"
          >
            {copied ? "ENLACE COPIADO ✓" : "COPIAR ENLACE"}
          </button>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Link
          href="/mi-membresia"
          className="btn btn-primary w-full sm:w-auto !min-h-[3.5rem] !px-8 text-xs tracking-[0.25em]"
        >
          VER MI MEMBRESÍA
        </Link>
        <a
          href="#beneficios"
          className="btn btn-ghost w-full sm:w-auto !min-h-[3.5rem] !px-8 text-xs tracking-[0.25em]"
        >
          VER BENEFICIOS
        </a>
      </div>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-ash/60 tracking-widest uppercase mt-8 hover:text-bone underline"
        >
          Registrar otro miembro
        </button>
      )}
    </div>
  );
}
