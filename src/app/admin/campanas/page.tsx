"use client";

import { useEffect, useState } from "react";
import { Megaphone, QrCode, Copy, Check, ExternalLink, Users } from "lucide-react";

export default function AdminCampaignsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const CAMPAIGNS = [
    {
      name: "Playera Club Oficial",
      code: "playera",
      utm: "playera",
      description: "Código QR bordado / impreso en merch y playeras oficiales de Bacachá",
      url: "https://bacacha.com/?utm_source=merch&utm_medium=qr&utm_campaign=playera",
    },
    {
      name: "Campaña Instagram Reels",
      code: "instagram",
      utm: "instagram",
      description: "Anuncios y enlaces directos desde el perfil oficial de Instagram @clubbacacha",
      url: "https://bacacha.com/?utm_source=instagram&utm_medium=social&utm_campaign=instagram",
    },
    {
      name: "Mesa VIP QR",
      code: "mesa",
      utm: "mesa",
      description: "Displays de acrílico y cartas en clubs y restaurantes afiliados en Acapulco",
      url: "https://bacacha.com/?utm_source=venue&utm_medium=table_qr&utm_campaign=mesa",
    },
    {
      name: "Flyer Acapulco Playa",
      code: "flyer",
      utm: "flyer",
      description: "Flyers y postales exclusivas en puntos turísticos y hoteles asociados",
      url: "https://bacacha.com/?utm_source=print&utm_medium=flyer&utm_campaign=flyer",
    },
  ];

  const handleCopy = (url: string, code: string) => {
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-amber-400" />
            <span>CAMPAÑAS DE ADQUISICIÓN & QR CODES</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Canales de registro de miembros · Atribución de tráfico y medición por código UTM
          </p>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CAMPAIGNS.map((c) => (
          <div
            key={c.code}
            className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4 shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-300 font-mono text-[0.65rem] uppercase">
                  Código: {c.code}
                </span>
                <QrCode className="w-4 h-4 text-neutral-500" />
              </div>

              <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">
                {c.name}
              </h3>
              <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                {c.description}
              </p>

              <div className="pt-2">
                <span className="text-[0.62rem] font-mono text-neutral-500 uppercase block mb-1">
                  Enlace de Afiliación con Atribución:
                </span>
                <input
                  type="text"
                  readOnly
                  value={c.url}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-850 flex items-center justify-between">
              <button
                onClick={() => handleCopy(c.url, c.code)}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-neutral-200 text-xs font-mono flex items-center gap-1.5 transition-colors border border-neutral-800"
              >
                {copiedCode === c.code ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Enlace Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>

              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Probar Enlace</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
