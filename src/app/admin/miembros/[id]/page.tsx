"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ChevronLeft,
  QrCode,
  Shield,
  Award,
  Calendar,
  Gift,
  Share2,
  MessageSquare,
  FileText,
  Lock,
  ExternalLink,
  Plus,
  Send,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type TabKey =
  | "personales"
  | "membresia"
  | "actividad"
  | "eventos"
  | "beneficios"
  | "referidos"
  | "comunicaciones"
  | "notas"
  | "consentimientos";

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("personales");

  // New Note state
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // WhatsApp template modal state
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waMessage, setWaMessage] = useState("");
  const [waTemplate, setWaTemplate] = useState("bienvenida");

  const fetchMember = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        router.push("/admin/miembros");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchMember();
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/admin/members/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote }),
      });
      if (res.ok) {
        setNewNote("");
        fetchMember();
      }
    } finally {
      setSubmittingNote(false);
    }
  };

  const openWhatsAppWithTemplate = (templateSlug: string) => {
    if (!data?.member) return;
    const m = data.member;
    let templateText = "";

    switch (templateSlug) {
      case "bienvenida":
        templateText = `¡Hola ${m.first_name}! Bienvenido oficialmente a Club Bacachá. Tu membresía es la #${m.member_number}. Prepárate para beneficios y experiencias exclusivas.`;
        break;
      case "cumpleanos":
        templateText = `¡Feliz cumpleaños ${m.first_name} de parte de todo el equipo de Club Bacachá! 🍾 Queremos celebrarte en grande con una cortesía especial en tu próxima visita.`;
        break;
      case "reactivacion":
        templateText = `¡${m.first_name}, hace rato que no te vemos en el Club Bacachá! Tenemos nuevas fechas y experiencias en Acapulco. ¿Te reservamos una mesa para este fin de semana?`;
        break;
      case "beneficio":
        templateText = `Hola ${m.first_name}, tienes promociones secretas activas en Club Bacachá con tu membresía #${m.member_number}. Muestra tu QR de socio en tu próxima visita.`;
        break;
      default:
        templateText = `Hola ${m.first_name}, te escribimos de Club Bacachá sobre tu membresía #${m.member_number}.`;
    }

    setWaTemplate(templateSlug);
    setWaMessage(templateText);
    setWaModalOpen(true);
  };

  const handleConfirmSendWhatsApp = async () => {
    if (!data?.member) return;
    const cleanPhone = data.member.phone.replace(/\D/g, "");

    // Log the click in communications
    try {
      await fetch(`/api/admin/members/${id}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "WHATSAPP_CLICK",
          templateSlug: waTemplate,
          messagePreview: waMessage,
          phone: data.member.phone,
        }),
      });
    } catch {}

    setWaModalOpen(false);
    fetchMember();

    // Open WhatsApp
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`, "_blank");
  };

  if (loading || !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-xs font-mono tracking-widest text-neutral-400 uppercase">
          Cargando expediente del miembro...
        </p>
      </div>
    );
  }

  const { member, score, tags, notes, activity, events, benefits, referrals, communications, consents } = data;

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "personales", label: "DATOS PERSONALES" },
    { key: "membresia", label: "MEMBRESÍA" },
    { key: "actividad", label: "ACTIVIDAD", count: activity.length },
    { key: "eventos", label: "EVENTOS", count: events.length },
    { key: "beneficios", label: "BENEFICIOS", count: benefits.length },
    { key: "referidos", label: "REFERIDOS", count: referrals.length },
    { key: "comunicaciones", label: "COMUNICACIONES", count: communications.length },
    { key: "notas", label: "NOTAS INTERNAS", count: notes.length },
    { key: "consentimientos", label: "CONSENTIMIENTOS", count: consents.length },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/miembros"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver al Directorio</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openWhatsAppWithTemplate("bienvenida")}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/70 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Contactar WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Hero Member Header Card */}
      <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xl font-serif font-bold text-amber-400 shadow-inner">
            {member.first_name[0]}
            {member.last_name[0]}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif text-white uppercase tracking-tight">
                {member.first_name} {member.last_name}
              </h1>
              <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                #{member.member_number}
              </span>
              <span
                className={`text-[0.65rem] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                  member.membership_level === "VIP" || member.membership_level === "BLACK_MEMBER"
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                    : "bg-neutral-850 text-neutral-300"
                }`}
              >
                {member.membership_level}
              </span>
            </div>

            <p className="text-xs font-mono text-neutral-400 flex items-center gap-2">
              <span>{member.city}</span>
              <span>·</span>
              <span>Afiliado el {new Date(member.created_at).toLocaleDateString()}</span>
              <span>·</span>
              <span className="text-emerald-400">● {member.status}</span>
            </p>
          </div>
        </div>

        {/* Engagement pill */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
          <div className="text-right">
            <span className="text-[0.6rem] font-mono tracking-widest text-neutral-400 uppercase block">
              ENGAGEMENT SCORE
            </span>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-2xl font-bold font-mono text-amber-400">
                {score.total_score}
              </span>
              <span className="text-[0.68rem] font-mono text-neutral-400">pts</span>
            </div>
            <span className="text-[0.62rem] font-mono text-amber-300">
              {score.category.replace(/_/g, " ")}
            </span>
          </div>
          <Award className="w-8 h-8 text-amber-400 shrink-0" />
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-neutral-850 pb-px scrollbar-thin">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
                active
                  ? "border-amber-400 text-amber-300 font-semibold bg-neutral-900/40"
                  : "border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/20"
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span className="text-[0.6rem] px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {/* TAB 1: DATOS PERSONALES */}
        {activeTab === "personales" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
              <h2 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
                INFORMACIÓN DE CONTACTO
              </h2>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Nombre completo</span>
                  <span className="text-white font-medium">
                    {member.first_name} {member.last_name}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Teléfono / WhatsApp</span>
                  <span className="text-white">{member.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Correo electrónico</span>
                  <span className="text-white">{member.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Instagram</span>
                  <span className="text-white">{member.instagram || "No registrado"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Ciudad</span>
                  <span className="text-white">{member.city}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Fecha de Nacimiento</span>
                  <span className="text-white">
                    {member.birth_date} {member.age ? `(${member.age} años)` : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
              <h2 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
                ORIGEN Y METADATOS
              </h2>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Canal / Fuente</span>
                  <span className="text-white">{member.source || "Directo"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Campaña UTM</span>
                  <span className="text-white">{member.utm_campaign || "Sin campaña"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Referido por</span>
                  <span className="text-white">{member.referred_by_number ? `#${member.referred_by_number}` : "Ninguno"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Etiquetas</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {tags.length > 0 ? (
                      tags.map((t: string) => (
                        <span key={t} className="px-2 py-0.5 rounded bg-neutral-850 text-neutral-300 text-[0.65rem]">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-neutral-500">Sin etiquetas</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEMBRESÍA & QR */}
        {activeTab === "membresia" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
              <h2 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
                DATOS OFICIALES DE SOCIO
              </h2>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Número de Socio</span>
                  <span className="text-amber-400 font-bold">#{member.member_number}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Nivel Actual</span>
                  <span className="text-white font-semibold">{member.membership_level}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Estado</span>
                  <span className="text-emerald-400 font-semibold">{member.status}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Token de Verificación QR</span>
                  <span className="text-neutral-400 text-[0.62rem] truncate max-w-[200px]">
                    {member.qr_token}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-850">
                  <span className="text-neutral-500">Enlace de Verificación Público</span>
                  <a
                    href={`/m/${member.qr_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>/m/{member.qr_token.substring(0, 8)}...</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-xl bg-white text-black shadow-2xl">
                <QrCode className="w-32 h-32" />
              </div>
              <p className="text-xs font-mono text-neutral-400">
                Código QR oficial para check-in en eventos y validación de beneficios
              </p>
              <a
                href={`/member/verify/${member.qr_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-mono text-white transition-colors"
              >
                Abrir Pantalla de Verificación Oficial →
              </a>
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVIDAD */}
        {activeTab === "actividad" && (
          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
            <h2 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
              HISTORIAL CRONOLÓGICO DE ACCIONES
            </h2>
            {activity.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500 py-8 text-center">
                No hay actividad adicional registrada todavía.
              </p>
            ) : (
              <div className="space-y-3">
                {activity.map((a: any) => (
                  <div key={a.id} className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono flex items-center justify-between">
                    <div>
                      <span className="text-amber-400 font-semibold block">{a.activity_type}</span>
                      <span className="text-neutral-500 text-[0.65rem]">{JSON.stringify(a.metadata || {})}</span>
                    </div>
                    <span className="text-neutral-500 text-[0.65rem]">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EVENTOS */}
        {activeTab === "eventos" && (
          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
            <h2 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
              ASISTENCIAS Y CHECK-INS EN EVENTOS
            </h2>
            {events.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500 py-8 text-center">
                El socio no ha registrado asistencias verificadas a eventos.
              </p>
            ) : (
              <div className="space-y-3">
                {events.map((e: any) => (
                  <div key={e.id} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold text-sm block">{e.events?.name || "Evento"}</span>
                      <span className="text-neutral-400 text-[0.7rem]">{e.events?.venue} · {e.events?.city}</span>
                      <span className="text-neutral-500 text-[0.65rem] block mt-1">Verificado por: {e.verified_by_name || "Operador"}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[0.65rem]">ASISTENCIA CONFIRMADA</span>
                      <span className="text-neutral-500 text-[0.65rem] block mt-1">{new Date(e.checkin_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: BENEFICIOS */}
        {activeTab === "beneficios" && (
          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
            <h2 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
              BENEFICIOS ASIGNADOS Y CANJES
            </h2>
            {benefits.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500 py-8 text-center">
                No hay promociones o beneficios canjeados por este socio.
              </p>
            ) : (
              <div className="space-y-3">
                {benefits.map((b: any) => (
                  <div key={b.id} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold block">{b.benefits?.title || "Beneficio"}</span>
                      <span className="text-neutral-400 text-[0.7rem]">{b.benefits?.phrase}</span>
                      {b.notes && <span className="text-neutral-500 text-[0.65rem] block mt-1">Nota: {b.notes}</span>}
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[0.65rem]">{b.status}</span>
                      <span className="text-neutral-500 text-[0.65rem] block mt-1">{new Date(b.redeemed_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: REFERIDOS */}
        {activeTab === "referidos" && (
          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
            <h2 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
              AMIGOS INVITADOS Y REGISTROS CONFIRMADOS
            </h2>
            {referrals.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500 py-8 text-center">
                Este socio aún no tiene referidos confirmados.
              </p>
            ) : (
              <div className="space-y-3">
                {referrals.map((r: any) => (
                  <div key={r.id} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold block">
                        {r.referred?.first_name} {r.referred?.last_name}
                      </span>
                      <span className="text-neutral-400 text-[0.7rem]">
                        #{r.referred?.member_number} · {r.referred?.city}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-[0.65rem]">{r.status}</span>
                      <span className="text-neutral-500 text-[0.65rem] block mt-1">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: COMUNICACIONES */}
        {activeTab === "comunicaciones" && (
          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
                HISTORIAL DE CONTACTOS Y CLICS
              </h2>
              <button
                onClick={() => openWhatsAppWithTemplate("personalizado")}
                className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-semibold text-xs font-mono flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Contacto</span>
              </button>
            </div>

            {communications.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500 py-8 text-center">
                Sin registros de comunicaciones previas con este miembro.
              </p>
            ) : (
              <div className="space-y-3">
                {communications.map((c: any) => (
                  <div key={c.id} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-semibold">{c.channel}</span>
                      <span className="text-neutral-500 text-[0.65rem]">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-neutral-300 text-xs">{c.message_preview || "Sin vista previa"}</p>
                    <div className="flex items-center justify-between text-[0.62rem] text-neutral-500 pt-1 border-t border-neutral-850/40">
                      <span>Registrado por: {c.actor_name}</span>
                      <span>Plantilla: {c.template_slug || "libre"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: NOTAS INTERNAS */}
        {activeTab === "notas" && (
          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-6">
            <h2 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
              NOTAS INTERNAS DEL PERSONAL
            </h2>

            {/* Form */}
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escribe una observación privada sobre este socio (preferencias de mesa, contactos, notas de atención)..."
                rows={3}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none focus:border-amber-400"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingNote || !newNote.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs font-mono disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingNote ? "Guardando..." : "Guardar Nota"}</span>
                </button>
              </div>
            </form>

            {/* List */}
            <div className="space-y-3 pt-2 border-t border-neutral-850">
              {notes.length === 0 ? (
                <p className="text-xs font-mono text-neutral-500 py-6 text-center">
                  No hay notas internas registradas todavía.
                </p>
              ) : (
                notes.map((n: any) => (
                  <div key={n.id} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 space-y-1">
                    <p className="text-xs text-neutral-200 font-sans">{n.note}</p>
                    <div className="flex items-center justify-between text-[0.62rem] font-mono text-neutral-500 pt-2 border-t border-neutral-850/50">
                      <span>Por: {n.author_name}</span>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 9: CONSENTIMIENTOS */}
        {activeTab === "consentimientos" && (
          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
            <h2 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-widest">
              HISTORIAL DE CONSENTIMIENTOS Y PRIVACIDAD
            </h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold block">Aviso de Privacidad Legal</span>
                  <span className="text-neutral-500 text-[0.65rem]">Aceptación obligatoria al afiliarse al Club</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs">
                  {member.privacy_consent ? "ACEPTADO" : "PENDIENTE"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-850 text-xs font-mono flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold block">Comunicaciones Promocionales (WhatsApp & Email)</span>
                  <span className="text-neutral-500 text-[0.65rem]">Permiso voluntario para envíos publicitarios</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  member.marketing_consent
                    ? "bg-emerald-950/70 border border-emerald-500/30 text-emerald-400"
                    : "bg-neutral-850 text-neutral-500"
                }`}>
                  {member.marketing_consent ? "ACEPTADO" : "NO ACEPTADO"}
                </span>
              </div>

              {consents.map((c: any) => (
                <div key={c.id} className="p-3 rounded-xl bg-neutral-900/40 border border-neutral-850/60 text-xs font-mono text-neutral-400 flex items-center justify-between">
                  <span>{c.consent_type}</span>
                  <span className="text-[0.65rem] text-neutral-500">{new Date(c.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Modal with Template Preview */}
      {waModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white font-mono uppercase">
                Enviar WhatsApp a {member.first_name}
              </h3>
              <span className="text-xs font-mono text-neutral-500">{member.phone}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Plantilla Oficial
                </label>
                <select
                  value={waTemplate}
                  onChange={(e) => openWhatsAppWithTemplate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                >
                  <option value="bienvenida">Bienvenida al Club</option>
                  <option value="cumpleanos">Felicitación de Cumpleaños</option>
                  <option value="reactivacion">Campaña de Reactivación</option>
                  <option value="beneficio">Recordatorio de Beneficio</option>
                  <option value="personalizado">Mensaje Libre</option>
                </select>
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Mensaje (editable antes de abrir)
                </label>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-850 text-[0.68rem] font-mono text-neutral-400 space-y-1">
                <span className="block font-semibold text-neutral-300">Aviso Operativo:</span>
                <span>Se registrará un evento de &quot;Click to Chat&quot; en la bitácora del socio. No se marcará falsamente como entregado o leído.</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-850">
              <button
                onClick={() => setWaModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSendWhatsApp}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Abrir WhatsApp Web</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
