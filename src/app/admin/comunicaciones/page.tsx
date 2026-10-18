"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Phone, Copy, Check, Clock, UserCheck } from "lucide-react";

export default function AdminCommunicationsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    // Standard default templates
    setTemplates([
      {
        slug: "bienvenida",
        name: "Bienvenida Oficial al Club",
        category: "Onboarding",
        text: "¡Hola {{nombre}}! Bienvenido oficialmente a Club Bacachá. Tu membresía es la #{{member_id}}. Prepárate para beneficios y experiencias exclusivas que no publicamos en redes.",
      },
      {
        slug: "cumpleanos",
        name: "Felicitación de Cumpleaños & Cortesía",
        category: "Celebración",
        text: "¡Feliz cumpleaños {{nombre}} de parte de todo el equipo de Club Bacachá! 🍾 Queremos celebrarte en grande con una cortesía especial en tu próxima visita.",
      },
      {
        slug: "invitacion_evento",
        name: "Invitación a Fecha Exclusiva",
        category: "Eventos",
        text: "Hola {{nombre}}, tenemos una fecha privada para miembros del Club: {{evento}} este {{fecha}}. Tu acceso de socio #{{member_id}} tiene lugar reservado. ¿Nos vemos ahí?",
      },
      {
        slug: "beneficio",
        name: "Recordatorio de Beneficio Disponible",
        category: "Beneficios",
        text: "Hola {{nombre}}, tienes disponible el beneficio: {{beneficio}} exclusivo con tu membresía #{{member_id}}. Muestra tu QR de socio en tu próxima visita para hacerlo válido.",
      },
      {
        slug: "reactivacion",
        name: "Campaña de Reactivación",
        category: "Fidelización",
        text: "¡{{nombre}}, hace rato que no te vemos en el Club! Tenemos nuevas fechas y experiencias que te van a encantar. ¿Te reservamos una mesa para este fin de semana?",
      },
      {
        slug: "agradecimiento_referido",
        name: "Agradecimiento por Recomendación",
        category: "Embajadores",
        text: "¡Muchas gracias {{nombre}} por invitar amigos al Club Bacachá! Tus recomendados ya son parte del Club y tu puntuación de embajador ha subido.",
      },
    ]);
  }, []);

  const copyToClipboard = (text: string, slug: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            <span>CENTRO DE COMUNICACIONES & WHATSAPP</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Plantillas oficiales aprobadas con variables dinámicas · Trazabilidad de clics y contactos
          </p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
          PLANTILLAS PREDETERMINADAS DISPONIBLES
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <div
              key={tpl.slug}
              className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[0.62rem] font-mono bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 uppercase">
                    {tpl.category}
                  </span>
                  <span className="text-[0.65rem] font-mono text-neutral-500">{tpl.slug}</span>
                </div>

                <h3 className="text-sm font-semibold text-white font-mono">{tpl.name}</h3>
                <p className="text-xs text-neutral-300 font-mono leading-relaxed bg-neutral-900/60 p-3 rounded-xl border border-neutral-850">
                  {tpl.text}
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-850 flex items-center justify-between">
                <span className="text-[0.62rem] font-mono text-neutral-500">
                  Variables: &#123;&#123;nombre&#125;&#125;, &#123;&#123;member_id&#125;&#125;
                </span>

                <button
                  onClick={() => copyToClipboard(tpl.text, tpl.slug)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors border border-neutral-800"
                >
                  {copiedSlug === tpl.slug ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
