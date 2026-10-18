"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Checkin Modal
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [identifierInput, setIdentifierInput] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinResult, setCheckinResult] = useState<{
    success: boolean;
    message: string;
    member?: any;
    scoreAwarded?: number;
  } | null>(null);

  // New Event Modal
  const [newEventModalOpen, setNewEventModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    venue: "",
    city: "Acapulco",
    event_date: "",
    event_time: "22:00",
    description: "",
  });
  const [creatingEvent, setCreatingEvent] = useState(false);

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

  const handlePerformCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !identifierInput.trim()) return;

    setCheckinLoading(true);
    setCheckinResult(null);

    try {
      const input = identifierInput.trim();
      const payload: any = { eventId: selectedEventId };

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
        });
        setIdentifierInput("");
      } else {
        setCheckinResult({
          success: false,
          message: data.error || "No se pudo procesar el check-in",
          member: data.member,
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name || !newEvent.venue || !newEvent.event_date) return;
    setCreatingEvent(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      if (res.ok) {
        setNewEventModalOpen(false);
        setNewEvent({
          name: "",
          venue: "",
          city: "Acapulco",
          event_date: "",
          event_time: "22:00",
          description: "",
        });
        fetchEvents();
      }
    } finally {
      setCreatingEvent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-400" />
            <span>GESTIÓN DE EVENTOS & CHECK-IN</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Validación de accesos físicos por QR · Trazabilidad de asistencias (+20 pts)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (events.length > 0) setSelectedEventId(events[0].id);
              setCheckinModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs flex items-center gap-2 transition-colors shadow-lg shadow-purple-600/20"
          >
            <QrCode className="w-4 h-4" />
            <span>Validar QR / Check-in</span>
          </button>

          <button
            onClick={() => setNewEventModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs font-mono text-neutral-500">
            Cargando eventos oficiales...
          </div>
        ) : events.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs font-mono text-neutral-500">
            No hay eventos registrados en la base de datos.
          </div>
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4 hover:border-neutral-700 transition-colors shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[0.62rem] font-mono bg-purple-950/70 border border-purple-500/30 text-purple-300 uppercase">
                    {evt.status}
                  </span>
                  <span className="text-[0.68rem] font-mono text-neutral-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{evt.event_time}</span>
                  </span>
                </div>

                <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">
                  {evt.name}
                </h3>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed line-clamp-2">
                  {evt.description}
                </p>

                <div className="pt-2 border-t border-neutral-850/60 space-y-1.5 text-xs font-mono text-neutral-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{evt.venue} · {evt.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Fecha: {evt.event_date}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-850 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedEventId(evt.id);
                    setCheckinModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-purple-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors border border-purple-500/20"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Hacer Check-in</span>
                </button>

                <span className="text-[0.68rem] font-mono text-neutral-500">
                  {evt.members_only ? "Solo Miembros" : "Abierto a Club"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Check-in QR Modal */}
      {checkinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white font-mono uppercase flex items-center gap-2">
                <QrCode className="w-4 h-4 text-purple-400" />
                <span>VALIDAR ENTRADA · CHECK-IN</span>
              </h3>
              <button
                onClick={() => {
                  setCheckinModalOpen(false);
                  setCheckinResult(null);
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
                <span className="text-[0.62rem] font-mono text-neutral-500 mt-1 block">
                  Acepta el código hexadecimal del QR o el número de membresía del socio.
                </span>
              </div>

              {checkinResult && (
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
              )}

              <button
                type="submit"
                disabled={checkinLoading || !identifierInput.trim()}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {checkinLoading ? "Validando..." : "Confirmar Asistencia (+20 pts)"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New Event Modal */}
      {newEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white font-mono uppercase">
              Crear Nuevo Evento Club Bacachá
            </h3>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Nombre del Evento
                </label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  placeholder="Ej: Noche Privada Bahía"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Lugar / Venue
                </label>
                <input
                  type="text"
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                  placeholder="Ej: Las Brisas / Playa privada"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                    Hora
                  </label>
                  <input
                    type="text"
                    value={newEvent.event_time}
                    onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Descripción
                </label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={2}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-850">
                <button
                  type="button"
                  onClick={() => setNewEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingEvent}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs font-mono"
                >
                  {creatingEvent ? "Guardando..." : "Crear Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
