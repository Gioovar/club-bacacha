"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Cake,
  MessageSquare,
  Gift,
  Calendar,
  Phone,
  Sparkles,
  MapPin,
  Clock,
  UserCheck,
  CheckCircle2,
  FileText,
  Send,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Filter,
} from "lucide-react";

type BirthdayMember = {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  bMonth: number;
  bDay: number;
  effectiveDay: number;
  isFeb29: boolean;
  turningAge: number;
  city: string;
  phone: string;
  email: string;
  membershipLevel: string;
  marketingConsent: boolean;
  diffDays: number;
  isToday: boolean;
  isTomorrow: boolean;
  isNext7Days: boolean;
  isThisMonth: boolean;
  lastGreeting?: {
    created_at: string;
    actor_name: string;
    channel: string;
    message_preview: string;
  } | null;
};

type BirthdayStats = {
  totalWithBirthDate: number;
  todayCount: number;
  tomorrowCount: number;
  next7DaysCount: number;
  thisMonthCount: number;
};

export default function AdminBirthdaysPage() {
  const [members, setMembers] = useState<BirthdayMember[]>([]);
  const [stats, setStats] = useState<BirthdayStats>({
    totalWithBirthDate: 0,
    todayCount: 0,
    tomorrowCount: 0,
    next7DaysCount: 0,
    thisMonthCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<"hoy" | "manana" | "7dias" | "mes" | "todos">("hoy");
  const [selectedCity, setSelectedCity] = useState("TODAS");
  const [selectedAgeRange, setSelectedAgeRange] = useState("TODOS");

  // WhatsApp Greeting Modal
  const [greetingModalOpen, setGreetingModalOpen] = useState(false);
  const [greetingMember, setGreetingMember] = useState<BirthdayMember | null>(null);
  const [greetingText, setGreetingText] = useState("");
  const [loggingGreeting, setLoggingGreeting] = useState(false);
  const [greetingSuccess, setGreetingSuccess] = useState(false);

  // Assign Benefit Modal
  const [benefitModalOpen, setBenefitModalOpen] = useState(false);
  const [benefitMember, setBenefitMember] = useState<BirthdayMember | null>(null);
  const [benefitName, setBenefitName] = useState("Botella de Cumpleaños Bacachá");
  const [assigningBenefit, setAssigningBenefit] = useState(false);
  const [benefitSuccess, setBenefitSuccess] = useState(false);

  // Add Note Modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteMember, setNoteMember] = useState<BirthdayMember | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  const fetchBirthdays = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cumpleanos");
      if (res.ok) {
        const json = await res.json();
        setMembers(json.members || []);
        if (json.stats) setStats(json.stats);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdays();
  }, []);

  // Cities list from members
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.city) set.add(m.city.trim());
    });
    return Array.from(set).sort();
  }, [members]);

  // Filtered members based on tab, city, and age bracket
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Tab filter
      if (activeTab === "hoy" && !m.isToday) return false;
      if (activeTab === "manana" && !m.isTomorrow) return false;
      if (activeTab === "7dias" && !m.isNext7Days) return false;
      if (activeTab === "mes" && !m.isThisMonth) return false;

      // City filter
      if (selectedCity !== "TODAS" && m.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }

      // Age range filter
      if (selectedAgeRange === "18-24" && (m.turningAge < 18 || m.turningAge > 24)) return false;
      if (selectedAgeRange === "25-34" && (m.turningAge < 25 || m.turningAge > 34)) return false;
      if (selectedAgeRange === "35-44" && (m.turningAge < 35 || m.turningAge > 44)) return false;
      if (selectedAgeRange === "45+" && m.turningAge < 45) return false;

      return true;
    });
  }, [members, activeTab, selectedCity, selectedAgeRange]);

  // Open WhatsApp greeting modal
  const openGreetingModal = (m: BirthdayMember) => {
    setGreetingMember(m);
    const template = `🎂 ¡Feliz cumpleaños, ${m.firstName}! En Club Bacachá queremos celebrar contigo. Tenemos sorpresas especiales para ti. 🥳`;
    setGreetingText(template);
    setGreetingSuccess(false);
    setGreetingModalOpen(true);
  };

  const handleOpenWhatsApp = () => {
    if (!greetingMember) return;
    const cleanPhone = greetingMember.phone.replace(/\D/g, "");
    const waUrl = `https://wa.me/${cleanPhone.startsWith("52") ? cleanPhone : "52" + cleanPhone}?text=${encodeURIComponent(greetingText)}`;
    window.open(waUrl, "_blank");
  };

  const handleConfirmGreeting = async () => {
    if (!greetingMember) return;
    setLoggingGreeting(true);
    try {
      const res = await fetch("/api/admin/cumpleanos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: greetingMember.id,
          messagePreview: greetingText,
          phone: greetingMember.phone,
          channel: "WHATSAPP",
        }),
      });
      if (res.ok) {
        setGreetingSuccess(true);
        fetchBirthdays();
        setTimeout(() => {
          setGreetingModalOpen(false);
          setGreetingSuccess(false);
        }, 1500);
      }
    } finally {
      setLoggingGreeting(false);
    }
  };

  // Open Assign Benefit modal
  const openBenefitModal = (m: BirthdayMember) => {
    setBenefitMember(m);
    setBenefitName("Botella de Cumpleaños Bacachá");
    setBenefitSuccess(false);
    setBenefitModalOpen(true);
  };

  const handleAssignBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!benefitMember) return;
    setAssigningBenefit(true);
    try {
      // Find or assign benefit via member API
      const res = await fetch(`/api/admin/members/${benefitMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_level: benefitMember.membershipLevel, // keeps level
        }),
      });
      // Also log communication/note about the benefit assigned
      await fetch(`/api/admin/members/${benefitMember.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: `🎁 BENEFICIO DE CUMPLEAÑOS ASIGNADO: ${benefitName}. Válido durante su semana de cumpleaños.`,
        }),
      });

      setBenefitSuccess(true);
      fetchBirthdays();
      setTimeout(() => {
        setBenefitModalOpen(false);
        setBenefitSuccess(false);
      }, 1500);
    } finally {
      setAssigningBenefit(false);
    }
  };

  // Open Add Note modal
  const openNoteModal = (m: BirthdayMember) => {
    setNoteMember(m);
    setNoteText("");
    setNoteSuccess(false);
    setNoteModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteMember || !noteText.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/members/${noteMember.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteText.trim() }),
      });
      if (res.ok) {
        setNoteSuccess(true);
        setTimeout(() => {
          setNoteModalOpen(false);
          setNoteSuccess(false);
        }, 1200);
      }
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <Cake className="w-6 h-6 text-pink-400" />
            <span>SISTEMA DE CUMPLEAÑOS & FIDELIZACIÓN</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Celebración personalizada de socios · Automatizaciones preparadas para Meta WhatsApp Cloud API
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-pink-950/60 border border-pink-500/30 text-pink-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{stats.todayCount} Hoy</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300">
            {stats.next7DaysCount} en 7 días
          </span>
        </div>
      </div>

      {/* Primary KPI Navigation Tabs */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-neutral-850">
        {[
          { key: "hoy", label: "🎂 Cumpleaños de Hoy", count: stats.todayCount, color: "text-pink-400" },
          { key: "manana", label: "📅 Cumpleaños de Mañana", count: stats.tomorrowCount, color: "text-amber-400" },
          { key: "7dias", label: "⚡ Próximos 7 Días", count: stats.next7DaysCount, color: "text-purple-400" },
          { key: "mes", label: "🗓️ Cumpleaños del Mes", count: stats.thisMonthCount, color: "text-cyan-400" },
          { key: "todos", label: "🌍 Todos los Registrados", count: stats.totalWithBirthDate, color: "text-neutral-400" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-mono flex items-center gap-2 transition-all ${
              activeTab === tab.key
                ? "bg-neutral-800 text-white border border-neutral-700 font-bold shadow-md"
                : "bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-850"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[0.62rem] ${
                activeTab === tab.key ? "bg-neutral-900 text-white" : "bg-neutral-900 text-neutral-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Toolbar: City & Age Bracket */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-neutral-950 border border-neutral-850">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <Filter className="w-3.5 h-3.5 text-neutral-500" />
          <span>Filtros rápidos:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* City selector */}
          <div className="flex items-center gap-2">
            <span className="text-[0.68rem] font-mono text-neutral-500 uppercase">Ciudad:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-pink-400"
            >
              <option value="TODAS">Todas las ciudades</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Age range selector */}
          <div className="flex items-center gap-2">
            <span className="text-[0.68rem] font-mono text-neutral-500 uppercase">Edad:</span>
            <select
              value={selectedAgeRange}
              onChange={(e) => setSelectedAgeRange(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-pink-400"
            >
              <option value="TODOS">Todas las edades</option>
              <option value="18-24">18 – 24 años</option>
              <option value="25-34">25 – 34 años</option>
              <option value="35-44">35 – 44 años</option>
              <option value="45+">45+ años</option>
            </select>
          </div>
        </div>
      </div>

      {/* Birthday Members Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-neutral-500">
          Cargando registros de cumpleaños y felicitaciones...
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="py-20 text-center bg-neutral-950 border border-neutral-850 rounded-2xl p-8 space-y-2">
          <Cake className="w-8 h-8 text-neutral-600 mx-auto" />
          <p className="text-sm font-serif text-white">No hay socios que coincidan con los filtros seleccionados.</p>
          <p className="text-xs font-mono text-neutral-500">
            Prueba cambiando la pestaña de tiempo o los filtros de ciudad y rango de edad.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((m) => {
            const formattedDate = m.birthDate ? m.birthDate.split("-").reverse().join("/") : "";
            const isToday = m.isToday;

            return (
              <div
                key={m.id}
                className={`p-6 rounded-2xl bg-neutral-950 border flex flex-col justify-between transition-all shadow-xl ${
                  isToday
                    ? "border-pink-500/50 shadow-pink-500/10 ring-1 ring-pink-500/30"
                    : "border-neutral-850 hover:border-neutral-700"
                }`}
              >
                <div className="space-y-4">
                  {/* Top line badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-pink-400">
                        #{m.memberNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[0.62rem] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300 uppercase">
                        {m.membershipLevel}
                      </span>
                    </div>

                    {isToday ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[0.65rem] font-mono font-bold bg-pink-500 text-black uppercase animate-pulse">
                        ¡CUMPLE HOY! 🎂
                      </span>
                    ) : m.isTomorrow ? (
                      <span className="px-2 py-0.5 rounded-full text-[0.62rem] font-mono bg-amber-950/80 border border-amber-500/40 text-amber-300 uppercase">
                        Mañana
                      </span>
                    ) : (
                      <span className="text-[0.65rem] font-mono text-neutral-500">
                        En {m.diffDays} días
                      </span>
                    )}
                  </div>

                  {/* Member Name & City */}
                  <div>
                    <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">
                      {m.firstName} {m.lastName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs font-mono text-neutral-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-neutral-500" />
                        {m.city}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-neutral-500" />
                        {m.phone}
                      </span>
                    </div>
                  </div>

                  {/* Age & Date Stats */}
                  <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-850/80 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[0.62rem] text-neutral-500 uppercase block">Cumpleaños:</span>
                      <span className="text-white font-medium">
                        {formattedDate} {m.isFeb29 ? "(29 Feb)" : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-[0.62rem] text-neutral-500 uppercase block">Edad que cumple:</span>
                      <span className="text-pink-300 font-bold">{m.turningAge} años 🥳</span>
                    </div>
                  </div>

                  {/* Last Greeting status & Marketing consent */}
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-[0.68rem]">
                      <span className="text-neutral-500">Última felicitación:</span>
                      {m.lastGreeting ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{new Date(m.lastGreeting.created_at).toLocaleDateString()}</span>
                        </span>
                      ) : (
                        <span className="text-neutral-500 italic">Sin felicitación registrada</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[0.68rem]">
                      <span className="text-neutral-500">Consentimiento de mensajes:</span>
                      {m.marketingConsent ? (
                        <span className="text-emerald-400">Aceptado ✓</span>
                      ) : (
                        <span className="text-amber-400">Solo avisos de servicio</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="pt-4 mt-4 border-t border-neutral-850 space-y-2">
                  <button
                    onClick={() => openGreetingModal(m)}
                    className="w-full py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shadow-pink-600/20"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>FELICITAR POR WHATSAPP</span>
                  </button>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => openBenefitModal(m)}
                      className="py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-300 text-[0.68rem] font-mono flex items-center justify-center gap-1 transition-colors border border-amber-500/20"
                      title="Asignar beneficio o botella"
                    >
                      <Gift className="w-3 h-3" />
                      <span>Beneficio</span>
                    </button>

                    <button
                      onClick={() => openNoteModal(m)}
                      className="py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[0.68rem] font-mono flex items-center justify-center gap-1 transition-colors border border-neutral-800"
                      title="Agregar nota"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Nota</span>
                    </button>

                    <Link
                      href={`/admin/miembros/${m.id}`}
                      className="py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[0.68rem] font-mono flex items-center justify-center gap-1 transition-colors border border-neutral-800"
                      title="Ver expediente del socio"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Perfil</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WHATSAPP GREETING MODAL */}
      {greetingModalOpen && greetingMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
              <div className="flex items-center gap-2">
                <Cake className="w-5 h-5 text-pink-400" />
                <h3 className="font-serif text-lg text-white uppercase">
                  Felicitación de Cumpleaños
                </h3>
              </div>
              <button
                onClick={() => setGreetingModalOpen(false)}
                className="text-neutral-500 hover:text-white text-xs font-mono"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-400">Socio:</span>
                <span className="text-white font-bold">{greetingMember.firstName} {greetingMember.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">WhatsApp:</span>
                <span className="text-pink-300 font-mono">{greetingMember.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Edad que cumple:</span>
                <span className="text-white">{greetingMember.turningAge} años</span>
              </div>
            </div>

            {/* Editable Greeting Message */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-neutral-300 block">
                Mensaje personalizado (editable):
              </label>
              <textarea
                value={greetingText}
                onChange={(e) => setGreetingText(e.target.value)}
                rows={4}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-pink-400 leading-relaxed"
              />
              <p className="text-[0.68rem] text-neutral-500 font-mono">
                Puedes personalizar el texto antes de abrir WhatsApp o enviar.
              </p>
            </div>

            {/* Verification note & Meta API readiness */}
            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-850 text-[0.68rem] font-mono text-neutral-400 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-300">
                <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
                <span>Control estricto de envíos</span>
              </div>
              <p>
                El mensaje no se marcará como enviado automáticamente hasta que confirmes el registro manual. Preparado para alternar con Meta WhatsApp Cloud API cuando esté configurada.
              </p>
            </div>

            {greetingSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono text-center">
                ✓ Felicitación registrada con éxito en el historial del socio.
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="btn btn-primary flex-1 !min-h-[2.75rem] !text-xs font-mono tracking-wider flex items-center justify-center gap-2 !bg-emerald-600 hover:!bg-emerald-500"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ABRIR EN WHATSAPP</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmGreeting}
                disabled={loggingGreeting}
                className="btn btn-ghost flex-1 !min-h-[2.75rem] !text-xs font-mono tracking-wider disabled:opacity-50"
              >
                {loggingGreeting ? "REGISTRANDO..." : "MARCAR COMO ENVIADO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN BENEFIT MODAL */}
      {benefitModalOpen && benefitMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAssignBenefit}
            className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif text-lg text-white uppercase">
                  Asignar Beneficio de Cumpleaños
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBenefitModalOpen(false)}
                className="text-neutral-500 hover:text-white text-xs font-mono"
              >
                ✕ Cerrar
              </button>
            </div>

            <p className="text-xs font-mono text-neutral-400">
              Asignar cortesía de celebración para <strong className="text-white">{benefitMember.firstName} {benefitMember.lastName}</strong>:
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono text-neutral-300 block">
                Selecciona o escribe el beneficio:
              </label>
              <select
                value={benefitName}
                onChange={(e) => setBenefitName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
              >
                <option value="Botella de Cumpleaños Bacachá">Botella de Cumpleaños Bacachá</option>
                <option value="Cortesía Bacachá Doble para la Mesa">Cortesía Bacachá Doble para la Mesa</option>
                <option value="Acceso VIP + Pulseras Preferenciales">Acceso VIP + Pulseras Preferenciales</option>
                <option value="Ronda de Shots de Celebración">Ronda de Shots de Celebración</option>
              </select>
            </div>

            {benefitSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono text-center">
                ✓ Beneficio de celebración asignado exitosamente.
              </div>
            )}

            <button
              type="submit"
              disabled={assigningBenefit}
              className="btn btn-primary w-full !min-h-[2.75rem] !text-xs font-mono tracking-wider !bg-amber-400 !text-black font-semibold disabled:opacity-50"
            >
              {assigningBenefit ? "ASIGNANDO..." : "CONFIRMAR ASIGNACIÓN"}
            </button>
          </form>
        </div>
      )}

      {/* ADD NOTE MODAL */}
      {noteModalOpen && noteMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveNote}
            className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-neutral-400" />
                <h3 className="font-serif text-lg text-white uppercase">
                  Agregar Nota al Socio
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNoteModalOpen(false)}
                className="text-neutral-500 hover:text-white text-xs font-mono"
              >
                ✕ Cerrar
              </button>
            </div>

            <p className="text-xs font-mono text-neutral-400">
              Socio: <strong className="text-white">{noteMember.firstName} {noteMember.lastName}</strong> (#{noteMember.memberNumber})
            </p>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ej: Prefiere celebrar en terraza, avisó que viene con 8 amigos..."
              rows={4}
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
            />

            {noteSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono text-center">
                ✓ Nota guardada correctamente.
              </div>
            )}

            <button
              type="submit"
              disabled={savingNote || !noteText.trim()}
              className="btn btn-primary w-full !min-h-[2.75rem] !text-xs font-mono tracking-wider disabled:opacity-50"
            >
              {savingNote ? "GUARDANDO..." : "GUARDAR NOTA"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
