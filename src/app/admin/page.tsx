"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

// Initial fallback records for local preview before Supabase is connected
const INITIAL_MEMBERS = [
  {
    id: "1",
    member_number: "001284",
    first_name: "Giovanni",
    last_name: "Vargas",
    phone: "7441234567",
    email: "giovanni@bacacha.com",
    city: "Acapulco",
    birth_date: "1998-05-14",
    created_at: "2026-10-17T12:00:00Z",
    source: "direct",
    utm_campaign: "playera_qr",
    referred_by_number: "000104",
    marketing_consent: true,
    status: "ACTIVE",
    membership_level: "VIP",
  },
  {
    id: "2",
    member_number: "001283",
    first_name: "Mariana",
    last_name: "Delgado",
    phone: "5589123456",
    email: "mariana.delgado@gmail.com",
    city: "CDMX",
    birth_date: "2001-11-20",
    created_at: "2026-10-17T10:00:00Z",
    source: "instagram",
    utm_campaign: "instagram_reels",
    referred_by_number: "—",
    marketing_consent: true,
    status: "ACTIVE",
    membership_level: "MEMBER",
  },
  {
    id: "3",
    member_number: "001282",
    first_name: "Rodrigo",
    last_name: "Morales",
    phone: "7774567890",
    email: "rodrigo.m@outlook.com",
    city: "Cuernavaca",
    birth_date: "1995-10-24",
    created_at: "2026-10-16T18:00:00Z",
    source: "qr",
    utm_campaign: "mesa_vip_qr",
    referred_by_number: "000912",
    marketing_consent: false,
    status: "ACTIVE",
    membership_level: "FOUNDING_MEMBER",
  },
];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "members" | "events" | "benefits">("dashboard");
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);

  // New Event Form State
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    venue: "",
    event_date: "",
    event_time: "22:00",
    description: "",
  });

  // Fetch real members from API
  useEffect(() => {
    fetch("/api/admin/members")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members?.length > 0) {
          setMembers(data.members);
        }
      })
      .catch(() => {});
  }, []);

  const filteredMembers = members.filter((m) => {
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    const matchSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.member_number.includes(searchTerm) ||
      m.phone.includes(searchTerm);
    const matchCity = cityFilter === "ALL" || m.city === cityFilter;
    const matchStatus = statusFilter === "ALL" || m.status === statusFilter;
    return matchSearch && matchCity && matchStatus;
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    );
    try {
      await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Member ID",
      "Nombre",
      "Apellido",
      "WhatsApp",
      "Email",
      "Ciudad",
      "Cumpleaños",
      "Campaña",
      "Referido Por",
      "Marketing",
      "Nivel",
      "Estado",
      "Fecha Registro",
    ];

    const rows = filteredMembers.map((m) => [
      `#${m.member_number}`,
      `"${m.first_name}"`,
      `"${m.last_name}"`,
      `"${m.phone}"`,
      `"${m.email}"`,
      `"${m.city}"`,
      `"${m.birth_date}"`,
      `"${m.utm_campaign || "—"}"`,
      `"${m.referred_by_number || "—"}"`,
      m.marketing_consent ? "SÍ" : "NO",
      m.membership_level,
      m.status,
      `"${m.created_at}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `club_bacacha_miembros_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#070707] text-bone flex flex-col font-sans">
      {/* Admin Top Header */}
      <header className="bg-coal border-b border-bone/10 py-4 px-6 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <BrandLogo size="sm" />
          <span className="px-2 py-0.5 rounded bg-bone/10 text-[0.65rem] font-mono tracking-widest text-ash uppercase">
            ADMIN PANEL · PRODUCCIÓN
          </span>
        </div>

        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-4 text-xs tracking-wider uppercase font-mono">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`pb-1 border-b-2 transition-colors ${
                activeTab === "dashboard"
                  ? "border-bone text-bone"
                  : "border-transparent text-ash hover:text-bone"
              }`}
            >
              Métricas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`pb-1 border-b-2 transition-colors ${
                activeTab === "members"
                  ? "border-bone text-bone"
                  : "border-transparent text-ash hover:text-bone"
              }`}
            >
              Miembros ({filteredMembers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("events")}
              className={`pb-1 border-b-2 transition-colors ${
                activeTab === "events"
                  ? "border-bone text-bone"
                  : "border-transparent text-ash hover:text-bone"
              }`}
            >
              Eventos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("benefits")}
              className={`pb-1 border-b-2 transition-colors ${
                activeTab === "benefits"
                  ? "border-bone text-bone"
                  : "border-transparent text-ash hover:text-bone"
              }`}
            >
              Beneficios
            </button>
          </nav>

          <Link
            href="/"
            className="text-xs tracking-widest uppercase text-ash hover:text-bone underline ml-4"
          >
            Ver Sitio Web →
          </Link>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-10">
        {activeTab === "dashboard" && (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="p-6 bg-coal border border-bone/10">
                <span className="text-[0.65rem] tracking-[0.25em] uppercase text-ash block mb-2">
                  TOTAL MIEMBROS
                </span>
                <span className="display text-4xl sm:text-5xl text-bone">
                  {members.length}
                </span>
                <span className="text-xs text-bone/60 block mt-2 font-mono">
                  Base de datos activa
                </span>
              </div>

              <div className="p-6 bg-coal border border-bone/10">
                <span className="text-[0.65rem] tracking-[0.25em] uppercase text-ash block mb-2">
                  ACTIVOS
                </span>
                <span className="display text-4xl sm:text-5xl text-bone">
                  {members.filter((m) => m.status === "ACTIVE").length}
                </span>
                <span className="text-xs text-bone/60 block mt-2 font-mono">
                  Membresías vigentes
                </span>
              </div>

              <div className="p-6 bg-coal border border-bone/10">
                <span className="text-[0.65rem] tracking-[0.25em] uppercase text-ash block mb-2">
                  CONSENTIMIENTO MKT
                </span>
                <span className="display text-4xl sm:text-5xl text-bone">
                  {members.filter((m) => m.marketing_consent).length}
                </span>
                <span className="text-xs text-bone/60 block mt-2 font-mono">
                  WhatsApp / Correo
                </span>
              </div>

              <div className="p-6 bg-coal border border-bone/10">
                <span className="text-[0.65rem] tracking-[0.25em] uppercase text-ash block mb-2">
                  VIP / FOUNDERS
                </span>
                <span className="display text-4xl sm:text-5xl text-bone">
                  {members.filter((m) => m.membership_level !== "MEMBER").length}
                </span>
                <span className="text-xs text-bone/60 block mt-2 font-mono">
                  Niveles exclusivos
                </span>
              </div>
            </div>

            {/* Middle Insight Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ciudades */}
              <div className="p-6 bg-coal border border-bone/10">
                <h3 className="display text-xl uppercase mb-4 tracking-tight">
                  CIUDADES PRINCIPALES
                </h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-bone">Acapulco</span>
                    <span className="text-ash">
                      {members.filter((m) => m.city.toLowerCase().includes("acapulco")).length} miembros
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-bone">CDMX</span>
                    <span className="text-ash">
                      {members.filter((m) => m.city.toLowerCase().includes("cdmx") || m.city.toLowerCase().includes("méxico")).length} miembros
                    </span>
                  </div>
                </div>
              </div>

              {/* Cumpleaños Próximos */}
              <div className="p-6 bg-coal border border-bone/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="display text-xl uppercase tracking-tight">
                    CUMPLEAÑOS
                  </h3>
                  <span className="px-2 py-0.5 bg-bone/10 text-[0.65rem] font-mono text-bone">
                    OCTUBRE
                  </span>
                </div>
                <p className="text-xs text-fog leading-relaxed mb-4">
                  Miembros con fecha de nacimiento en el mes actual listos para
                  beneficios de cumpleaños.
                </p>
                <div className="space-y-2 text-xs font-mono text-ash">
                  {members
                    .filter((m) => m.birth_date && m.birth_date.slice(5, 7) === "10")
                    .map((m) => (
                      <div key={m.id} className="p-2 bg-ink/60 border border-bone/5 flex justify-between">
                        <span>{m.first_name} {m.last_name}</span>
                        <span className="text-bone">{m.birth_date.slice(5)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Campañas y QR Tracking */}
              <div className="p-6 bg-coal border border-bone/10">
                <h3 className="display text-xl uppercase mb-4 tracking-tight">
                  CAMPAÑAS / QR
                </h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-bone">?utm=playera_qr</span>
                    <span className="text-ash">Playera oficial</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-bone">?utm=instagram_reels</span>
                    <span className="text-ash">Campaña IG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-bone">?utm=mesa_vip_qr</span>
                    <span className="text-ash">Mesa QR</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Member Directory / Table */}
        {activeTab === "members" && (
          <div className="bg-coal border border-bone/10 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="display text-2xl uppercase">DIRECTORIO DE MIEMBROS</h2>
                <p className="text-xs text-ash font-mono mt-1">
                  Base de datos en tiempo real · Control de estados y exportación
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar nombre, ID, teléfono..."
                  className="bg-ink border border-bone/20 text-xs px-3 py-2 text-bone placeholder:text-ash/60 focus:outline-none focus:border-bone font-mono min-w-[200px]"
                />

                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="bg-ink border border-bone/20 text-xs px-3 py-2 text-bone font-mono focus:outline-none"
                >
                  <option value="ALL">Todas las ciudades</option>
                  <option value="Acapulco">Acapulco</option>
                  <option value="CDMX">CDMX</option>
                  <option value="Cuernavaca">Cuernavaca</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-ink border border-bone/20 text-xs px-3 py-2 text-bone font-mono focus:outline-none"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="VIP">VIP</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>

                <button
                  type="button"
                  onClick={exportCSV}
                  className="btn btn-primary !min-h-[2.25rem] !px-4 !text-xs font-mono tracking-wider"
                >
                  EXPORTAR CSV ↓
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-bone/20 text-ash text-[0.65rem] tracking-wider uppercase">
                    <th className="py-3 px-2">MEMBER ID</th>
                    <th className="py-3 px-2">NOMBRE</th>
                    <th className="py-3 px-2">WHATSAPP</th>
                    <th className="py-3 px-2">EMAIL</th>
                    <th className="py-3 px-2">CIUDAD</th>
                    <th className="py-3 px-2">CUMPLEAÑOS</th>
                    <th className="py-3 px-2">CAMPAÑA</th>
                    <th className="py-3 px-2">MKT</th>
                    <th className="py-3 px-2">NIVEL</th>
                    <th className="py-3 px-2">ESTADO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bone/10">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-ink/50 transition-colors">
                      <td className="py-3 px-2 font-bold text-bone">#{m.member_number}</td>
                      <td className="py-3 px-2 text-bone">
                        {m.first_name} {m.last_name}
                      </td>
                      <td className="py-3 px-2 text-ash">{m.phone}</td>
                      <td className="py-3 px-2 text-ash">{m.email}</td>
                      <td className="py-3 px-2 text-bone/90">{m.city}</td>
                      <td className="py-3 px-2 text-ash">{m.birth_date}</td>
                      <td className="py-3 px-2 text-ash">{m.utm_campaign || "direct"}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-1.5 py-0.5 text-[0.6rem] rounded ${
                            m.marketing_consent
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/20"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {m.marketing_consent ? "SÍ" : "NO"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-bone/80">{m.membership_level}</td>
                      <td className="py-3 px-2">
                        <select
                          value={m.status}
                          onChange={(e) => handleStatusChange(m.id, e.target.value)}
                          className="bg-ink border border-bone/20 text-[0.7rem] px-2 py-1 text-bone font-mono rounded"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="VIP">VIP</option>
                          <option value="BLOCKED">BLOCKED</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Events Manager Tab */}
        {activeTab === "events" && (
          <div className="bg-coal border border-bone/10 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="display text-2xl uppercase">GESTIÓN DE EVENTOS</h2>
                <p className="text-xs text-ash font-mono mt-1">
                  Publica o edita eventos para la agenda de Club Bacachá
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEventModal(!showEventModal)}
                className="btn btn-primary !min-h-[2.5rem] !px-4 !text-xs font-mono"
              >
                + NUEVO EVENTO
              </button>
            </div>

            {showEventModal && (
              <div className="p-6 bg-ink border border-bone/20 rounded-xl space-y-4 max-w-lg">
                <h3 className="display text-xl uppercase">Crear Evento</h3>
                <input
                  type="text"
                  placeholder="Nombre del evento"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="field-input text-xs"
                />
                <input
                  type="text"
                  placeholder="Locación / Venue"
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                  className="field-input text-xs"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="date"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    className="field-input text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Hora (ej. 22:00)"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                    className="field-input text-xs"
                  />
                </div>
                <textarea
                  placeholder="Descripción corta"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full bg-transparent border-b border-bone/25 text-xs p-2 text-bone"
                  rows={2}
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch("/api/admin/events", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(newEvent),
                      });
                      setShowEventModal(false);
                    }}
                    className="btn btn-primary !min-h-[2.5rem] !px-4 text-xs font-mono"
                  >
                    GUARDAR EVENTO
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="btn btn-ghost !min-h-[2.5rem] !px-4 text-xs font-mono"
                  >
                    CANCELAR
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-ink border border-bone/10 flex justify-between items-center">
                <div>
                  <h4 className="display text-lg uppercase text-bone">NOCHE CERO</h4>
                  <p className="text-xs text-ash font-mono">2026-10-31 · 22:00 HRS · Locación secreta</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[0.65rem] font-mono border border-emerald-500/20">
                  PUBLICADO
                </span>
              </div>
              <div className="p-4 bg-ink border border-bone/10 flex justify-between items-center">
                <div>
                  <h4 className="display text-lg uppercase text-bone">BAHÍA AFTER DARK</h4>
                  <p className="text-xs text-ash font-mono">2026-11-14 · 21:00 HRS · Bahía de Santa Lucía</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-[0.65rem] font-mono border border-emerald-500/20">
                  PUBLICADO
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Manager Tab */}
        {activeTab === "benefits" && (
          <div className="bg-coal border border-bone/10 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="display text-2xl uppercase">GESTIÓN DE BENEFICIOS</h2>
              <p className="text-xs text-ash font-mono mt-1">
                Activa o desactiva beneficios para los miembros del Club
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title: "Promociones Secretas", slug: "promociones-secretas" },
                { title: "Eventos Exclusivos", slug: "eventos" },
                { title: "Cumpleaños VIP", slug: "cumpleanos" },
                { title: "Accesos Preferenciales", slug: "accesos" },
                { title: "Experiencias Únicas", slug: "experiencias" },
                { title: "Invitaciones Privadas", slug: "invitaciones" },
                { title: "Sorpresas en Barra", slug: "sorpresas" },
                { title: "Beneficios de Miembro", slug: "beneficios-miembros" },
              ].map((b) => (
                <div key={b.slug} className="p-4 bg-ink border border-bone/10 flex flex-col justify-between">
                  <h4 className="display text-base uppercase text-bone mb-3">{b.title}</h4>
                  <div className="flex justify-between items-center text-xs font-mono pt-3 border-t border-bone/10">
                    <span className="text-emerald-400">ACTIVO</span>
                    <button
                      type="button"
                      className="text-ash underline hover:text-bone text-[0.7rem]"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
