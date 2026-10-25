"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Plus,
  QrCode,
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  Search,
  AlertCircle,
  Sparkles,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Archive,
  Globe,
  UploadCloud,
  X,
  Ticket,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Phone,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface ClubAdminEvent {
  id: string;
  slug: string;
  name: string;
  description: string;
  short_description?: string;
  image_url: string;
  venue: string;
  city: string;
  address?: string;
  directions?: string;
  event_date: string;
  event_time: string;
  end_time?: string;
  status: "draft" | "scheduled" | "published" | "sold_out" | "cancelled" | "past" | "archived";
  members_only: boolean;
  capacity?: number;
  availableSlots?: number;
  is_free?: boolean;
  ticket_price?: number;
  has_rsvp?: boolean;
  rsvp_status?: string;
  social_dynamic?: string;
  points_award?: number;
  checkinsCount?: number;
  registrationsCount?: number;
  socialPlans?: {
    PLAN_LIGUE: number;
    HACER_AMIGOS: number;
    EN_PAREJA: number;
    SOLO_DIVERTIRME: number;
    SIN_ETIQUETA: number;
  };
  created_at?: string;
}

interface EventRegistrationItem {
  id: string;
  social_plan: string;
  status: string;
  created_at: string;
  members: {
    id: string;
    member_number: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    status: string;
    membership_level: string;
  };
}

interface EventCheckinItem {
  id: string;
  checkin_at: string;
  social_plan: string;
  verified_by_name: string;
  members: {
    id: string;
    member_number: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<ClubAdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewEventData, setPreviewEventData] = useState<ClubAdminEvent | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<ClubAdminEvent | null>(null);
  const [detailTab, setDetailTab] = useState<"reservations" | "checkins">("reservations");
  const [detailRegistrations, setDetailRegistrations] = useState<EventRegistrationItem[]>([]);
  const [detailCheckins, setDetailCheckins] = useState<EventCheckinItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState("");

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<ClubAdminEvent | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Check-in live QR modal
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [identifierInput, setIdentifierInput] = useState("");
  const [checkinSocialPlan, setCheckinSocialPlan] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinResult, setCheckinResult] = useState<{
    success: boolean;
    message: string;
    member?: any;
    scoreAwarded?: number;
    socialPlan?: string;
  } | null>(null);

  // Form State
  const initialFormState: Partial<ClubAdminEvent> = {
    name: "",
    slug: "",
    short_description: "",
    description: "",
    image_url: "/gran_inauguracion.png",
    venue: "Club Bacachá · Zona Diamante",
    city: "Acapulco",
    address: "Costera Miguel Alemán, Acapulco, Gro.",
    directions: "Acceso exclusivo con membresía digital y confirmación.",
    event_date: "",
    event_time: "21:00",
    end_time: "04:00",
    status: "draft",
    members_only: false,
    capacity: 250,
    is_free: true,
    ticket_price: 0,
    has_rsvp: true,
    rsvp_status: "open",
    social_dynamic: "SEMAFORO",
    points_award: 20,
  };

  const [formData, setFormData] = useState<Partial<ClubAdminEvent>>(initialFormState);
  const [savingEvent, setSavingEvent] = useState(false);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/events");
      if (res.ok) {
        const json = await res.json();
        setEvents(json.events || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        searchQuery === "" ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.city.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === "published") matchesStatus = e.status === "published";
      else if (statusFilter === "draft") matchesStatus = e.status === "draft";
      else if (statusFilter === "archived") matchesStatus = e.status === "archived" || e.status === "cancelled" || e.status === "past";

      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  // Overall Stats
  const stats = useMemo(() => {
    const total = events.length;
    const published = events.filter((e) => e.status === "published").length;
    const totalReservations = events.reduce((acc, curr) => acc + (curr.registrationsCount || 0), 0);
    const totalCheckins = events.reduce((acc, curr) => acc + (curr.checkinsCount || 0), 0);
    return { total, published, totalReservations, totalCheckins };
  }, [events]);

  // Open Edit
  const handleOpenEdit = (evt: ClubAdminEvent) => {
    setEditingEventId(evt.id);
    setFormData({
      ...initialFormState,
      ...evt,
    });
    setFormError(null);
    setEditorModalOpen(true);
  };

  // Open Create
  const handleOpenCreate = () => {
    setEditingEventId(null);
    setFormData(initialFormState);
    setFormError(null);
    setEditorModalOpen(true);
  };

  // Duplicate
  const handleDuplicate = async (evt: ClubAdminEvent) => {
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", sourceEventId: evt.id }),
      });
      if (res.ok) {
        await fetchEvents();
      }
    } catch (err) {
      console.error("Error duplicating event:", err);
    }
  };

  // Toggle publish / unpublish
  const handleTogglePublish = async (evt: ClubAdminEvent) => {
    const nextAction = evt.status === "published" ? "unpublish" : "publish";
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: evt.id, action: nextAction }),
      });
      if (res.ok) {
        await fetchEvents();
      }
    } catch (err) {
      console.error("Error toggling publish:", err);
    }
  };

  // Open Detail
  const handleOpenDetail = async (evt: ClubAdminEvent) => {
    setDetailEvent(evt);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${evt.id}`);
      if (res.ok) {
        const json = await res.json();
        setDetailRegistrations(json.registrations || []);
        setDetailCheckins(json.checkins || []);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Delete
  const handleOpenDelete = (evt: ClubAdminEvent) => {
    setEventToDelete(evt);
    setDeleteConfirmationText("");
    setDeleteWarning(null);
    setDeleteModalOpen(true);
  };

  // Execute Delete or Archive
  const handleExecuteDelete = async (force = false) => {
    if (!eventToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventToDelete.id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setDeleteWarning(data.error);
        } else {
          alert(data.error || "No se pudo eliminar el evento");
        }
        return;
      }

      setDeleteModalOpen(false);
      setEventToDelete(null);
      await fetchEvents();
    } catch {
      alert("Error al comunicarse con el servidor");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Quick Archive
  const handleArchiveInstead = async () => {
    if (!eventToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventToDelete.id, action: "archive" }),
      });
      if (res.ok) {
        setDeleteModalOpen(false);
        setEventToDelete(null);
        await fetchEvents();
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // Upload flyer file
  const handleFlyerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFlyer(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/events/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setFormData((prev) => ({ ...prev, image_url: data.url }));
      } else {
        alert(data.error || "Error al subir imagen");
      }
    } catch {
      alert("Error de conexión al subir imagen");
    } finally {
      setUploadingFlyer(false);
    }
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async (publishImmediate = false) => {
    if (!formData.name || !formData.venue || !formData.event_date) {
      setFormError("Por favor completa los campos obligatorios: Nombre, Lugar y Fecha.");
      return;
    }

    setSavingEvent(true);
    setFormError(null);

    const payload = {
      ...formData,
      status: publishImmediate ? "published" : formData.status || "draft",
    };

    try {
      const method = editingEventId ? "PATCH" : "POST";
      const body = editingEventId ? { id: editingEventId, ...payload } : payload;

      const res = await fetch("/api/admin/events", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "No se pudo guardar el evento");
        return;
      }

      setEditorModalOpen(false);
      await fetchEvents();
    } catch {
      setFormError("Error de comunicación con el servidor");
    } finally {
      setSavingEvent(false);
    }
  };

  // Check-in action
  const handlePerformCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !identifierInput.trim()) return;

    setCheckinLoading(true);
    setCheckinResult(null);

    try {
      const input = identifierInput.trim();
      const payload: any = { eventId: selectedEventId };

      if (checkinSocialPlan) {
        payload.socialPlan = checkinSocialPlan;
      }

      if (input.startsWith("#") || (!isNaN(Number(input)) && input.length <= 6)) {
        payload.memberNumber = input.replace("#", "");
      } else {
        payload.qrToken = input;
      }

      const res = await fetch("/api/admin/events/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCheckinResult({
          success: true,
          message: `Check-in exitoso para ${data.member.first_name} ${data.member.last_name} (#${data.member.member_number}). Se sumaron +${data.scoreAwarded} puntos de engagement.`,
          member: data.member,
          scoreAwarded: data.scoreAwarded,
          socialPlan: data.socialPlan || "SIN_ETIQUETA",
        });
        setIdentifierInput("");
        fetchEvents();
      } else {
        setCheckinResult({
          success: false,
          message: data.error || "No se pudo procesar el check-in",
          member: data.member,
          socialPlan: data.socialPlan,
        });
      }
    } catch {
      setCheckinResult({
        success: false,
        message: "Error de conexión con el servidor",
      });
    } finally {
      setCheckinLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-amber-400" />
            <span>GESTIÓN DE EVENTOS & CONVOCATORIAS</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Control de eventos oficiales, flyers en storage, aforos, reservaciones y check-in físico QR
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (events.length > 0 && !selectedEventId) setSelectedEventId(events[0].id);
              setCheckinModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Validar QR / Check-in</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono flex items-center gap-2 transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-[0.65rem] font-mono text-neutral-400 uppercase tracking-wider block">Total Eventos</span>
          <span className="text-2xl font-bold font-serif text-white tracking-tight">{stats.total}</span>
        </div>
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-[0.65rem] font-mono text-emerald-400 uppercase tracking-wider block">En Landing (Publicados)</span>
          <span className="text-2xl font-bold font-serif text-emerald-400 tracking-tight">{stats.published}</span>
        </div>
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-[0.65rem] font-mono text-amber-400 uppercase tracking-wider block">Reservas Confirmadas</span>
          <span className="text-2xl font-bold font-serif text-amber-300 tracking-tight">{stats.totalReservations}</span>
        </div>
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <span className="text-[0.65rem] font-mono text-purple-400 uppercase tracking-wider block">Asistencias por QR</span>
          <span className="text-2xl font-bold font-serif text-purple-300 tracking-tight">{stats.totalCheckins}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-950 border border-neutral-850">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              statusFilter === "all" ? "bg-neutral-800 text-white font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter("published")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              statusFilter === "published" ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Publicados ({stats.published})
          </button>
          <button
            onClick={() => setStatusFilter("draft")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              statusFilter === "draft" ? "bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Borradores
          </button>
          <button
            onClick={() => setStatusFilter("archived")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              statusFilter === "archived" ? "bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Archivados / Finalizados
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o lugar..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Events Cards Grid */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-neutral-700 border-t-amber-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono tracking-widest text-neutral-400 uppercase">
            Cargando eventos de Club Bacachá...
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-neutral-950 border border-neutral-850 p-8 space-y-4">
          <Calendar className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-base font-serif text-neutral-300 uppercase">No se encontraron eventos</h3>
          <p className="text-xs font-mono text-neutral-500 max-w-sm mx-auto">
            {searchQuery
              ? "No hay resultados para tu búsqueda. Prueba con otro término."
              : "No hay eventos en esta sección. Crea un nuevo evento para publicarlo en la landing."}
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono transition-colors"
          >
            Crear Nuevo Evento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => {
            const isPublished = evt.status === "published";
            const isDraft = evt.status === "draft";
            const isArchived = evt.status === "archived";

            return (
              <div
                key={evt.id}
                className="rounded-2xl bg-neutral-950 border border-neutral-850 hover:border-neutral-750 transition-all flex flex-col justify-between overflow-hidden shadow-xl group"
              >
                <div>
                  {/* Flyer Cover with overlay badges */}
                  <div className="relative aspect-[16/10] w-full bg-neutral-900 overflow-hidden">
                    <img
                      src={evt.image_url || "/gran_inauguracion.png"}
                      alt={evt.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      {isPublished ? (
                        <span className="px-2.5 py-1 rounded-md text-[0.62rem] font-mono font-bold bg-emerald-500 text-black shadow-md uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                          PUBLICADO EN VIVO
                        </span>
                      ) : isDraft ? (
                        <span className="px-2.5 py-1 rounded-md text-[0.62rem] font-mono font-bold bg-amber-400/90 text-black uppercase tracking-wider">
                          BORRADOR
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[0.62rem] font-mono bg-neutral-800 text-neutral-300 uppercase tracking-wider">
                          {evt.status}
                        </span>
                      )}
                    </div>

                    {/* Date Tag */}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-neutral-700 text-white font-mono text-[0.68rem]">
                      📅 {evt.event_date}
                    </div>

                    {/* Venue tag on image bottom */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[0.68rem] font-mono text-neutral-300">
                      <span className="truncate flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {evt.venue} · {evt.city}
                      </span>
                      <span className="text-neutral-400 shrink-0 ml-2">
                        {evt.event_time} HRS
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight line-clamp-1 group-hover:text-amber-300 transition-colors">
                        {evt.name}
                      </h3>
                      <p className="text-xs text-neutral-400 font-sans line-clamp-2 mt-1 leading-relaxed">
                        {evt.description}
                      </p>
                    </div>

                    {/* Real Metrics Container */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-neutral-900/80 border border-neutral-850 text-xs font-mono">
                      <div>
                        <span className="text-[0.62rem] text-neutral-500 uppercase block">Reservas</span>
                        <span className="text-white font-bold text-sm">
                          {evt.registrationsCount || 0}{" "}
                          <span className="text-[0.65rem] font-normal text-neutral-400">
                            / {evt.capacity ? `${evt.capacity} cupos` : "Libre"}
                          </span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[0.62rem] text-purple-400 uppercase block">Asistencias QR</span>
                        <span className="text-purple-300 font-bold text-sm">
                          {evt.checkinsCount || 0}{" "}
                          <span className="text-[0.65rem] font-normal text-neutral-400">validadas</span>
                        </span>
                      </div>
                    </div>

                    {/* Social Dynamic Semáforo Mini Breakdown */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/50 border border-neutral-850/80 text-[0.62rem] font-mono text-neutral-400">
                      <span>Dinámica Semáforo:</span>
                      <div className="flex items-center gap-2">
                        <span title="🔴 Pareja" className="text-red-400">🔴 {evt.socialPlans?.EN_PAREJA || 0}</span>
                        <span title="🟡 Amigos" className="text-amber-400">🟡 {evt.socialPlans?.HACER_AMIGOS || 0}</span>
                        <span title="🟢 Ligue" className="text-emerald-400">🟢 {evt.socialPlans?.PLAN_LIGUE || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-neutral-900/40 border-t border-neutral-850 space-y-2">
                  <div className="flex items-center gap-1.5">
                    {/* VER / DETALLE */}
                    <button
                      onClick={() => handleOpenDetail(evt)}
                      title="Ver reservaciones y asistencias"
                      className="flex-1 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs flex items-center justify-center gap-1 border border-neutral-800 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Ver</span>
                    </button>

                    {/* EDITAR */}
                    <button
                      onClick={() => handleOpenEdit(evt)}
                      title="Editar datos del evento"
                      className="flex-1 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 font-mono text-xs flex items-center justify-center gap-1 border border-neutral-800 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Editar</span>
                    </button>

                    {/* DUPLICAR */}
                    <button
                      onClick={() => handleDuplicate(evt)}
                      title="Duplicar como borrador"
                      className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* TOGGLE PUBLISH / UNPUBLISH */}
                    <button
                      onClick={() => handleTogglePublish(evt)}
                      title={isPublished ? "Despublicar evento" : "Publicar evento en la landing"}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isPublished
                          ? "bg-emerald-950/70 border-emerald-500/30 text-emerald-300 hover:bg-neutral-900"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-emerald-400"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </button>

                    {/* ELIMINAR */}
                    <button
                      onClick={() => handleOpenDelete(evt)}
                      title="Eliminar evento"
                      className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-950/60 border border-neutral-800 hover:border-red-500/40 text-neutral-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FORMULARIO VISUAL DE NUEVO EVENTO / EDITAR EVENTO                */}
      {/* ========================================================================= */}
      {editorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-850 flex items-center justify-between bg-neutral-900/60 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-serif font-bold text-white uppercase tracking-wide">
                  {editingEventId ? "Editar Evento Oficial" : "Nuevo Evento Oficial"}
                </h2>
              </div>
              <button
                onClick={() => setEditorModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-xs font-mono">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECCIÓN A: INFORMACIÓN PRINCIPAL */}
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-850 space-y-3.5">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-[0.72rem] font-bold text-amber-400 uppercase tracking-wider">
                    A. Información Principal
                  </span>
                  <span className="text-[0.65rem] text-neutral-500">* Campos obligatorios</span>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300">Nombre del Evento *</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Gran Inauguración Club Bacachá"
                    className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-neutral-300">Fecha del Evento *</label>
                    <input
                      type="date"
                      value={formData.event_date || ""}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-300">Hora de Inicio *</label>
                    <input
                      type="text"
                      value={formData.event_time || ""}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                      placeholder="21:00"
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-300">Hora Fin (opcional)</label>
                    <input
                      type="text"
                      value={formData.end_time || ""}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      placeholder="04:00"
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-neutral-300">Lugar / Venue *</label>
                    <input
                      type="text"
                      value={formData.venue || ""}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      placeholder="Ej: Club Bacachá · Zona Diamante"
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-300">Ciudad</label>
                    <input
                      type="text"
                      value={formData.city || ""}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Acapulco"
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300">Descripción Breve / Detalle del Evento</label>
                  <textarea
                    rows={2}
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detalla las promociones (ej. Botellas $599, Mojitos 2x1) y sorpresas de la noche."
                    className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400 font-sans"
                  />
                </div>
              </div>

              {/* SECCIÓN B: IMAGEN DEL EVENTO (FLYER) */}
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-850 space-y-3.5">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-[0.72rem] font-bold text-amber-400 uppercase tracking-wider">
                    B. Imagen del Evento (Flyer Oficial)
                  </span>
                  <span className="text-[0.65rem] text-neutral-400">JPG, PNG o WebP (Máx. 10MB)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Preview Container */}
                  <div className="relative aspect-[16/10] rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden flex items-center justify-center">
                    {formData.image_url ? (
                      <img
                        src={formData.image_url}
                        alt="Preview Flyer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-neutral-600 text-[0.68rem]">Sin imagen seleccionada</span>
                    )}

                    {uploadingFlyer && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-neutral-600 border-t-amber-400 rounded-full animate-spin" />
                        <span className="text-[0.65rem] text-amber-300">Subiendo a Supabase Storage...</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="space-y-3">
                    <label className="border-2 border-dashed border-neutral-750 hover:border-amber-400 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-black/40">
                      <UploadCloud className="w-7 h-7 text-amber-400 mb-1" />
                      <span className="text-xs text-white font-semibold">Subir Flyer desde tu equipo</span>
                      <span className="text-[0.62rem] text-neutral-500 mt-0.5">Arrastra o haz clic aquí</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFlyerFileUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="space-y-1">
                      <label className="text-neutral-400 text-[0.65rem]">O escribe la URL directa / flyer existente:</label>
                      <input
                        type="text"
                        value={formData.image_url || ""}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="/gran_inauguracion.png o https://..."
                        className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white focus:outline-none focus:border-amber-400 text-[0.68rem]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN C: RESERVACIONES & CONDICIONES */}
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-850 space-y-3.5">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-[0.72rem] font-bold text-amber-400 uppercase tracking-wider">
                    C. Reservaciones & Aforo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-neutral-300">Capacidad Máxima (Aforo)</label>
                    <input
                      type="number"
                      value={formData.capacity || ""}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                      placeholder="Ej: 250"
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300">Tipo de Acceso</label>
                    <select
                      value={formData.members_only ? "members" : "all"}
                      onChange={(e) => setFormData({ ...formData, members_only: e.target.value === "members" })}
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="all">Abierto a Socios e Invitados</option>
                      <option value="members">Exclusivo Sólo Miembros</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300">Costo de Entrada</label>
                    <select
                      value={formData.is_free ? "free" : "paid"}
                      onChange={(e) => setFormData({ ...formData, is_free: e.target.value === "free" })}
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="free">Acceso Libre / Cortesía Club</option>
                      <option value="paid">Con Cover o Preventa</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN D: DINÁMICA SOCIAL (SEMÁFORO) */}
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-850 space-y-3.5">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-[0.72rem] font-bold text-amber-400 uppercase tracking-wider">
                    D. Dinámica Social en Entrada
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="social_dynamic"
                        checked={formData.social_dynamic === "SEMAFORO"}
                        onChange={() => setFormData({ ...formData, social_dynamic: "SEMAFORO" })}
                        className="text-amber-400"
                      />
                      <span className="text-white font-bold">Activar Dinámica del Semáforo Oficial</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-black/60 border border-neutral-800 text-[0.65rem]">
                    <div className="p-2 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-center">
                      <span className="block font-bold">🔴 Pulsera Roja</span>
                      <span>Estoy con pareja</span>
                    </div>
                    <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-center">
                      <span className="block font-bold">🟡 Pulsera Amarilla</span>
                      <span>Hacer amigos</span>
                    </div>
                    <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-center">
                      <span className="block font-bold">🟢 Pulsera Verde</span>
                      <span>En busca de pareja</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN E: CHECK-IN Y PUNTOS */}
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-850 space-y-3.5">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-[0.72rem] font-bold text-amber-400 uppercase tracking-wider">
                    E. Acceso y Puntos por Asistencia
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <label className="text-neutral-300">Puntos de Fidelización por Check-in</label>
                    <input
                      type="number"
                      value={formData.points_award || 20}
                      onChange={(e) => setFormData({ ...formData, points_award: Number(e.target.value) })}
                      className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="text-[0.65rem] text-neutral-400 leading-relaxed pt-3">
                    Al escanear el QR físico o ingresar el # de socio durante el evento, el miembro recibe automáticamente estos puntos en su wallet digital.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 sm:p-5 border-t border-neutral-850 bg-neutral-900/90 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => {
                  setPreviewEventData(formData as ClubAdminEvent);
                  setPreviewModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Vista Previa Landing</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditorModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white font-mono text-xs"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={savingEvent}
                  onClick={() => handleSaveEvent(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-mono text-xs transition-colors"
                >
                  {savingEvent ? "Guardando..." : "Guardar como Borrador"}
                </button>

                <button
                  type="button"
                  disabled={savingEvent}
                  onClick={() => handleSaveEvent(true)}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold font-mono text-xs transition-all shadow-lg shadow-amber-400/20"
                >
                  {savingEvent ? "Publicando..." : "Publicar Ahora en Landing"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VISTA PREVIA IDÉNTICA A LA TARJETA DE LA LANDING                  */}
      {/* ========================================================================= */}
      {previewModalOpen && previewEventData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4">
            <div className="p-4 border-b border-neutral-850 flex items-center justify-between">
              <span className="text-xs font-mono text-amber-400 font-bold uppercase">
                👁️ Vista Previa de la Tarjeta en www.bacacha.com
              </span>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-neutral-500 hover:text-white text-xs font-mono"
              >
                Cerrar
              </button>
            </div>

            <div className="p-5">
              <div className="bg-black border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="relative aspect-[16/10] w-full bg-neutral-900">
                  <img
                    src={previewEventData.image_url || "/gran_inauguracion.png"}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <div className="absolute top-3 right-3 bg-neutral-100 text-black p-2 rounded text-center font-mono">
                    <span className="block text-lg font-bold leading-none">
                      {previewEventData.event_date ? previewEventData.event_date.split("-")[2] : "06"}
                    </span>
                    <span className="text-[0.55rem] uppercase font-bold">NOV</span>
                  </div>
                </div>
                <div className="p-6 space-y-3 font-mono">
                  <span className="text-[0.65rem] text-neutral-400 block">
                    {previewEventData.event_time} HRS · {previewEventData.city}
                  </span>
                  <h4 className="text-lg font-serif font-bold text-white uppercase">
                    {previewEventData.name || "Nombre del Evento"}
                  </h4>
                  <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                    {previewEventData.description}
                  </p>
                  <p className="text-xs text-amber-400">📍 {previewEventData.venue}</p>
                  <button
                    disabled
                    className="w-full py-3 bg-amber-400 text-black font-bold uppercase tracking-wider text-xs rounded-lg mt-2 opacity-90"
                  >
                    CONFIRMAR PLAN (DINÁMICA DEL SEMÁFORO)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DETALLE DE EVENTO (RESERVACIONES & ASISTENCIAS QR)               */}
      {/* ========================================================================= */}
      {detailModalOpen && detailEvent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="p-5 border-b border-neutral-850 flex items-center justify-between bg-neutral-900/60 sticky top-0 z-10">
              <div>
                <h3 className="text-base font-serif font-bold text-white uppercase">
                  {detailEvent.name}
                </h3>
                <p className="text-[0.68rem] font-mono text-neutral-400">
                  📅 {detailEvent.event_date} · 📍 {detailEvent.venue} · {detailRegistrations.length} reservas · {detailCheckins.length} asistencias
                </p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-bar Tabs & Search */}
            <div className="p-4 border-b border-neutral-850 bg-neutral-900/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailTab("reservations")}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    detailTab === "reservations"
                      ? "bg-amber-400 text-black font-bold"
                      : "bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                >
                  Reservaciones ({detailRegistrations.length})
                </button>
                <button
                  onClick={() => setDetailTab("checkins")}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    detailTab === "checkins"
                      ? "bg-purple-600 text-white font-bold"
                      : "bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                >
                  Asistencias QR ({detailCheckins.length})
                </button>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  placeholder="Buscar socio por nombre, # o cel..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Tab Contents */}
            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs">
              {detailLoading ? (
                <div className="py-16 text-center text-neutral-400">
                  <div className="w-6 h-6 border-2 border-neutral-700 border-t-amber-400 rounded-full animate-spin mx-auto mb-2" />
                  <span>Consultando base de datos oficial...</span>
                </div>
              ) : detailTab === "reservations" ? (
                detailRegistrations.length === 0 ? (
                  <div className="py-16 text-center text-neutral-500 space-y-2">
                    <Users className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p>Aún no hay reservaciones registradas para este evento.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailRegistrations
                      .filter((r) => {
                        const q = detailSearch.toLowerCase();
                        if (!q) return true;
                        const m = r.members;
                        return (
                          m?.first_name?.toLowerCase().includes(q) ||
                          m?.last_name?.toLowerCase().includes(q) ||
                          m?.member_number?.includes(q) ||
                          m?.phone?.includes(q)
                        );
                      })
                      .map((reg) => (
                        <div
                          key={reg.id}
                          className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-850 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-amber-400">
                              {(reg.members?.first_name || "M")[0]}
                            </div>
                            <div>
                              <div className="text-white font-bold">
                                {reg.members?.first_name} {reg.members?.last_name}
                              </div>
                              <div className="text-[0.65rem] text-neutral-400">
                                #{reg.members?.member_number} · Tel: {reg.members?.phone || "Sin tel"} · Registrado: {new Date(reg.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-1 rounded text-[0.62rem] font-bold ${
                                reg.social_plan === "EN_PAREJA"
                                  ? "bg-red-950/80 border border-red-500/40 text-red-300"
                                  : reg.social_plan === "HACER_AMIGOS"
                                  ? "bg-amber-950/80 border border-amber-500/40 text-amber-300"
                                  : "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                              }`}
                            >
                              {reg.social_plan === "EN_PAREJA"
                                ? "🔴 EN PAREJA"
                                : reg.social_plan === "HACER_AMIGOS"
                                ? "🟡 AMIGOS"
                                : "🟢 LIGUE"}
                            </span>

                            {reg.members?.phone && (
                              <a
                                href={`https://wa.me/${reg.members.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30"
                                title="Enviar WhatsApp al socio"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )
              ) : detailCheckins.length === 0 ? (
                <div className="py-16 text-center text-neutral-500 space-y-2">
                  <QrCode className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p>Aún no hay asistencias validadas por QR en este evento.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {detailCheckins.map((chk) => (
                    <div
                      key={chk.id}
                      className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-850 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
                        <div>
                          <div className="text-white font-bold">
                            {chk.members?.first_name} {chk.members?.last_name} (#{chk.members?.member_number})
                          </div>
                          <div className="text-[0.65rem] text-neutral-400">
                            Ingreso: {new Date(chk.checkin_at).toLocaleTimeString()} · Validador: {chk.verified_by_name || "Operador"}
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded text-[0.62rem] font-bold bg-purple-950/80 border border-purple-500/40 text-purple-300">
                        {chk.social_plan}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ELIMINAR / ARCHIVAR EVENTO CON REGLAS DE SEGURIDAD               */}
      {/* ========================================================================= */}
      {deleteModalOpen && eventToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase">Confirmación de Eliminación</h3>
            </div>

            <p className="text-neutral-300 leading-relaxed font-sans">
              Estás a punto de eliminar el evento{" "}
              <strong className="text-white">"{eventToDelete.name}"</strong>.
            </p>

            {deleteWarning ? (
              <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs space-y-3">
                <p>{deleteWarning}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleArchiveInstead}
                    disabled={deleteLoading}
                    className="flex-1 py-2 rounded-lg bg-amber-400 text-black font-bold uppercase text-[0.68rem]"
                  >
                    Archivar sin perder datos
                  </button>
                  <button
                    onClick={() => handleExecuteDelete(true)}
                    disabled={deleteLoading}
                    className="py-2 px-3 rounded-lg bg-red-950 hover:bg-red-900 border border-red-500/40 text-red-300 uppercase text-[0.68rem]"
                  >
                    Forzar Borrado
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-neutral-400 text-[0.68rem]">
                  Para confirmar, escribe exactamente el nombre del evento:
                </p>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder={eventToDelete.name}
                  className="w-full bg-black border border-neutral-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-red-400 text-xs"
                />

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    className="flex-1 py-2.5 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleExecuteDelete(false)}
                    disabled={deleteLoading || deleteConfirmationText !== eventToDelete.name}
                    className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold uppercase transition-colors"
                  >
                    {deleteLoading ? "Verificando..." : "Eliminar Evento"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: VALIDACIÓN EN VIVO DE CHECK-IN QR & PULSERA                      */}
      {/* ========================================================================= */}
      {checkinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white font-mono uppercase flex items-center gap-2">
                <QrCode className="w-4 h-4 text-purple-400" />
                <span>VALIDAR ENTRADA & PLAN SOCIAL</span>
              </h3>
              <button
                onClick={() => {
                  setCheckinModalOpen(false);
                  setCheckinResult(null);
                  setCheckinSocialPlan("");
                }}
                className="text-neutral-500 hover:text-white text-xs font-mono"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handlePerformCheckin} className="space-y-4">
              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Evento Seleccionado
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} ({evt.event_date})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  ¿En qué plan viene hoy? (Pulsera / Etiqueta)
                </label>
                <select
                  value={checkinSocialPlan}
                  onChange={(e) => setCheckinSocialPlan(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                >
                  <option value="">(Automático · según reserva del socio)</option>
                  <option value="EN_PAREJA">🔴 EN PAREJA — Pulsera Roja</option>
                  <option value="HACER_AMIGOS">🟡 HACER AMIGOS — Pulsera Amarilla</option>
                  <option value="PLAN_LIGUE">🟢 EN BUSCA DE PAREJA / LIGUE — Pulsera Verde</option>
                </select>
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Token QR o #Socio
                </label>
                <input
                  type="text"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  placeholder="Escanea el QR o escribe #000001..."
                  autoFocus
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              {checkinResult && (
                <div className="space-y-2">
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                      checkinResult.success
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                        : "bg-red-950/60 border-red-500/40 text-red-300"
                    }`}
                  >
                    {checkinResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <span>{checkinResult.message}</span>
                  </div>

                  {checkinResult.success && checkinResult.socialPlan && (
                    <div>
                      {checkinResult.socialPlan === "EN_PAREJA" && (
                        <div className="p-3.5 rounded-xl bg-red-950/90 border-2 border-red-500 text-red-200 font-mono text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-red-300">🔴 EN PAREJA</span>
                            <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[0.68rem] font-bold">
                              ENTREGAR PULSERA ROJA
                            </span>
                          </div>
                          <p className="text-[0.7rem] text-red-300/80">"Vengo con mi pareja a disfrutar"</p>
                        </div>
                      )}

                      {checkinResult.socialPlan === "HACER_AMIGOS" && (
                        <div className="p-3.5 rounded-xl bg-amber-950/90 border-2 border-amber-400 text-amber-200 font-mono text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-amber-300">🟡 HACER AMIGOS</span>
                            <span className="bg-amber-400 text-black px-2 py-0.5 rounded text-[0.68rem] font-bold">
                              ENTREGAR PULSERA AMARILLA
                            </span>
                          </div>
                          <p className="text-[0.7rem] text-amber-300/80">"Quiero conocer gente nueva y hacer amigos"</p>
                        </div>
                      )}

                      {checkinResult.socialPlan === "PLAN_LIGUE" && (
                        <div className="p-3.5 rounded-xl bg-emerald-950/90 border-2 border-emerald-400 text-emerald-200 font-mono text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-emerald-300">🟢 EN BUSCA DE PAREJA</span>
                            <span className="bg-emerald-400 text-black px-2 py-0.5 rounded text-[0.68rem] font-bold">
                              ENTREGAR PULSERA VERDE
                            </span>
                          </div>
                          <p className="text-[0.7rem] text-emerald-300/80">"Me gustaría conocer a alguien especial"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={checkinLoading || !identifierInput.trim()}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                {checkinLoading ? "Validando..." : "Confirmar Asistencia (+20 pts)"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
