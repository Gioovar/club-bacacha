"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { formatMemberNumber, memberLabel } from "@/lib/site";

type Props = {
  firstName: string;
  memberNumber: number;
  since: number;
  pointsBalance?: number;
  tier?: string;
  qrValue?: string;
  qrToken?: string;
  interactive?: boolean;
};

/**
 * MemberCard: Luxury Digital Credential.
 * Interactive 3D tilt on mouse move (desktop) and subtle tilt on mobile.
 * High-fashion matte black surface with gold/silver accents, member number, and working QR code.
 */
export function MemberCard({
  firstName,
  memberNumber,
  since,
  pointsBalance,
  tier,
  qrValue,
  qrToken,
  interactive = true,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  // Generate QR code data URL
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://bacacha.com";
    const value = qrValue || (qrToken ? `${origin}/m/${qrToken}` : `${origin}/m/${formatMemberNumber(memberNumber)}`);
    QRCode.toDataURL(value, {
      width: 140,
      margin: 1,
      color: {
        dark: "#050505",
        light: "#ece8e1",
      },
    })
      .then(setQrUrl)
      .catch(console.error);
  }, [memberNumber, qrValue, qrToken]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -12;
    const rY = ((x - centerX) / centerX) * 12;

    setRotateX(rX);
    setRotateY(rY);
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.35,
    });
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setRotateX(0);
    setRotateY(0);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      style={{ perspective: 1000 }}
      className="w-full max-w-[420px] mx-auto select-none"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: "transform 0.15s ease-out",
        }}
        className="relative aspect-[1.58/1] w-full rounded-2xl bg-gradient-to-br from-coal via-[#121212] to-black p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9),0_0_20px_rgba(255,255,255,0.05)] border border-bone/20"
      >
        {/* Subtle holographic sheen overlay */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}), transparent 60%)`,
          }}
        />

        {/* Top Bar: Brand + Tag + Points Pill */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex flex-col">
            <span className="display text-xl sm:text-2xl text-bone tracking-[0.2em]">
              BACACHÁ
            </span>
            <span className="text-[0.55rem] tracking-[0.35em] uppercase text-ash font-medium">
              CLUB PRIVADO
            </span>
          </div>

          <div className="flex items-center gap-2">
            {typeof pointsBalance === "number" && (
              <div className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[0.58rem] font-mono tracking-wider font-semibold shadow-inner">
                ★ {pointsBalance} PTS
              </div>
            )}
            <div className="px-3 py-1 rounded-full border border-bone/30 bg-ink/60 text-[0.6rem] tracking-[0.25em] uppercase text-bone font-semibold">
              {tier || "MEMBER"}
            </div>
          </div>
        </div>

        {/* Middle Area: Titular and points subline */}
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="text-[0.6rem] tracking-[0.3em] uppercase text-ash/80 block mb-1">
              TITULAR
            </span>
            <span className="display text-2xl sm:text-3xl text-bone tracking-wide uppercase">
              {firstName}
            </span>
            {typeof pointsBalance === "number" && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[0.62rem] font-mono text-amber-300 tracking-wider uppercase font-semibold">
                  {pointsBalance} PTS DISPONIBLES
                </span>
              </div>
            )}
          </div>

          {/* QR Container */}
          <div className="p-1.5 bg-bone rounded-lg shadow-inner">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="Member QR"
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-coal animate-pulse" />
            )}
          </div>
        </div>

        {/* Bottom Bar: Number + Since */}
        <div className="flex items-end justify-between border-t border-bone/10 pt-4 relative z-10">
          <div>
            <span className="text-[0.58rem] tracking-[0.3em] uppercase text-ash/70 block">
              MEMBER ID
            </span>
            <span className="font-mono text-xs sm:text-sm text-bone font-medium tracking-widest">
              {memberLabel(memberNumber)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[0.58rem] tracking-[0.3em] uppercase text-ash/70 block">
              SINCE
            </span>
            <span className="font-mono text-xs sm:text-sm text-bone/90">
              {since}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
