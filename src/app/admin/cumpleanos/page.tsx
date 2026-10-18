"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cake, MessageSquare, Gift, Calendar, Phone, Sparkles } from "lucide-react";

export default function AdminBirthdaysPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/members?limit=200")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) {
          setMembers(data.members);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const birthdayMembers = members.filter((m) => {
    if (!m.birth_date) return false;
    const bMonth = new Date(m.birth_date).getUTCMonth() + 1;
    return bMonth === selectedMonth;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase flex items-center gap-2">
            <Cake className="w-6 h-6 text-pink-400" />
            <span>CALENDARIO DE CUMPLEAÑOS</span>
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Socios que cumplen años por mes · Felicitaciones personalizadas y beneficios de celebración
          </p>
        </div>

        {/* Month Selector */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-pink-400"
        >
          {MONTH_NAMES.map((name, idx) => (
            <option key={idx + 1} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Birthday Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs font-mono text-neutral-500">
            Cargando fechas de cumpleaños...
          </div>
        ) : birthdayMembers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs font-mono text-neutral-500">
            No hay socios registrados con cumpleaños en {MONTH_NAMES[selectedMonth - 1]}.
          </div>
        ) : (
          birthdayMembers.map((m) => {
            const cleanPhone = m.phone ? m.phone.replace(/\D/g, "") : "";
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
              `¡Feliz cumpleaños ${m.first_name} de parte de todo el equipo de Club Bacachá! 🍾 Queremos celebrarte en grande con una cortesía especial en tu próxima visita.`
            )}`;

            return (
              <div
                key={m.id}
                className="p-6 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-pink-400">
                      #{m.member_number}
                    </span>
                    <span className="text-[0.68rem] font-mono text-neutral-400">
                      {m.city}
                    </span>
                  </div>

                  <h3 className="text-lg font-serif font-bold text-white uppercase tracking-tight">
                    {m.first_name} {m.last_name}
                  </h3>

                  <div className="space-y-1 text-xs font-mono text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-pink-400" />
                      <span>Fecha: {m.birth_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{m.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-850 flex items-center justify-between">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/70 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Felicitar WhatsApp</span>
                  </a>

                  <Link
                    href={`/admin/miembros/${m.id}`}
                    className="text-xs font-mono text-neutral-400 hover:text-white"
                  >
                    Ver ficha →
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
