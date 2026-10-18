"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Download,
  MessageSquare,
  Mail,
  Edit,
  Gift,
  Tag,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Shield,
  Phone,
} from "lucide-react";

interface Member {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  city: string;
  birth_date: string;
  age: number | null;
  status: string;
  membership_level: string;
  engagement_score: number;
  engagement_category: string;
  last_activity_at: string;
  events_attended_count: number;
  benefits_used_count: number;
  referrals_confirmed_count: number;
  utm_campaign?: string;
  tags: string[];
  created_at: string;
}

export default function MembersListPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [taggingLoading, setTaggingLoading] = useState(false);

  // Edit Modal
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editLevel, setEditLevel] = useState("MEMBER");
  const [editLoading, setEditLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
      });
      if (searchTerm) params.set("search", searchTerm);
      if (cityFilter !== "ALL") params.set("city", cityFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (levelFilter !== "ALL") params.set("level", levelFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);

      const res = await fetch(`/api/admin/members?${params.toString()}`);
      const data = await res.json();
      if (data.members) {
        setMembers(data.members);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || data.members.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [page, cityFilter, statusFilter, levelFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === members.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map((m) => m.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleApplyTags = async () => {
    if (!newTag.trim() || selectedIds.length === 0) return;
    setTaggingLoading(true);
    try {
      const res = await fetch("/api/admin/members/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: selectedIds, tag: newTag.trim() }),
      });
      if (res.ok) {
        setTagModalOpen(false);
        setNewTag("");
        setSelectedIds([]);
        fetchMembers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTaggingLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editMember) return;
    setEditLoading(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editMember.id,
          status: editStatus,
          membership_level: editLevel,
        }),
      });
      if (res.ok) {
        setEditMember(null);
        fetchMembers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif tracking-tight text-white uppercase">
            DIRECTORIO DE MIEMBROS
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            {totalCount} miembros registrados en Supabase · Filtros y acciones operativas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setTagModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-mono text-xs flex items-center gap-2 transition-colors border border-amber-400/20"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Etiquetar ({selectedIds.length})</span>
            </button>
          )}

          <a
            href="/api/admin/members/export"
            download
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs flex items-center gap-2 transition-colors border border-neutral-750"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Exportar CSV</span>
          </a>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, correo, teléfono o #Member ID..."
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-400/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-neutral-500 font-mono focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs tracking-wider uppercase font-mono transition-colors"
          >
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-neutral-850/60 text-xs font-mono">
          <span className="text-[0.68rem] uppercase tracking-wider text-neutral-500 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtros:
          </span>

          {/* City */}
          <select
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-300 text-xs focus:outline-none"
          >
            <option value="ALL">Todas las ciudades</option>
            <option value="Acapulco">Acapulco</option>
            <option value="CDMX">CDMX</option>
            <option value="Cuernavaca">Cuernavaca</option>
            <option value="Puebla">Puebla</option>
            <option value="Guadalajara">Guadalajara</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-300 text-xs focus:outline-none"
          >
            <option value="ALL">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="VIP">VIP</option>
            <option value="INACTIVE">Inactivos</option>
            <option value="BLOCKED">Bloqueados</option>
          </select>

          {/* Level */}
          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-300 text-xs focus:outline-none"
          >
            <option value="ALL">Todos los niveles</option>
            <option value="MEMBER">MEMBER</option>
            <option value="VIP">VIP</option>
            <option value="FOUNDING_MEMBER">FOUNDING MEMBER</option>
            <option value="BLACK_MEMBER">BLACK MEMBER</option>
          </select>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-300 text-xs focus:outline-none"
          >
            <option value="ALL">Categoría Fidelización</option>
            <option value="NUEVO_MIEMBRO">Nuevo Miembro</option>
            <option value="MIEMBRO_PARTICIPATIVO">Participativo</option>
            <option value="MIEMBRO_DESTACADO">Destacado</option>
            <option value="EMBAJADOR_CLUB">Embajador</option>
            <option value="SIN_ACTIVIDAD">Sin Actividad</option>
          </select>

          {(cityFilter !== "ALL" ||
            statusFilter !== "ALL" ||
            levelFilter !== "ALL" ||
            categoryFilter !== "ALL" ||
            searchTerm) && (
            <button
              onClick={() => {
                setCityFilter("ALL");
                setStatusFilter("ALL");
                setLevelFilter("ALL");
                setCategoryFilter("ALL");
                setSearchTerm("");
                setPage(1);
              }}
              className="text-[0.68rem] text-amber-400 hover:underline uppercase ml-auto"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-neutral-950 border border-neutral-850 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-850 bg-neutral-900/50 text-[0.62rem] font-mono tracking-widest text-neutral-400 uppercase">
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="p-1 hover:text-white">
                    {selectedIds.length > 0 && selectedIds.length === members.length ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-4">MEMBER ID</th>
                <th className="p-4">MIEMBRO</th>
                <th className="p-4">CONTACTO</th>
                <th className="p-4">CIUDAD / EDAD</th>
                <th className="p-4">NIVEL / ESTADO</th>
                <th className="p-4">SCORE</th>
                <th className="p-4">PARTICIPACIÓN</th>
                <th className="p-4">ETIQUETAS</th>
                <th className="p-4 text-right">ACCIONES</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-850/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-neutral-500 font-mono">
                    <div className="w-6 h-6 border-2 border-neutral-700 border-t-amber-400 rounded-full animate-spin mx-auto mb-2" />
                    Consultando base de datos de miembros...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-neutral-500 font-mono">
                    No se encontraron miembros con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const isSelected = selectedIds.includes(m.id);
                  const cleanPhone = m.phone ? m.phone.replace(/\D/g, "") : "";
                  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    `Hola ${m.first_name}, te escribimos de Club Bacachá sobre tu membresía #${m.member_number}.`
                  )}`;

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-neutral-900/50 transition-colors ${
                        isSelected ? "bg-neutral-900/40" : ""
                      }`}
                    >
                      <td className="p-4">
                        <button
                          onClick={() => toggleSelectOne(m.id)}
                          className="p-1 text-neutral-500 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Member ID */}
                      <td className="p-4">
                        <Link
                          href={`/admin/miembros/${m.id}`}
                          className="font-mono text-amber-400 font-semibold hover:underline"
                        >
                          #{m.member_number}
                        </Link>
                      </td>

                      {/* Name */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <Link
                            href={`/admin/miembros/${m.id}`}
                            className="font-medium text-white hover:text-amber-300 transition-colors"
                          >
                            {m.first_name} {m.last_name}
                          </Link>
                          <span className="text-[0.65rem] font-mono text-neutral-500">
                            Reg: {new Date(m.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-4 font-mono text-[0.72rem]">
                        <div className="space-y-0.5">
                          <div className="text-neutral-300 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-500" />
                            <span>{m.phone}</span>
                          </div>
                          <div className="text-neutral-500 text-[0.65rem] truncate max-w-[160px]">
                            {m.email}
                          </div>
                        </div>
                      </td>

                      {/* City / Age */}
                      <td className="p-4 font-mono text-[0.72rem]">
                        <div className="space-y-0.5">
                          <span className="text-neutral-300 block">{m.city || "—"}</span>
                          <span className="text-neutral-500 text-[0.65rem]">
                            {m.age ? `${m.age} años` : "—"} · {m.birth_date || ""}
                          </span>
                        </div>
                      </td>

                      {/* Level & Status */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[0.62rem] font-mono font-semibold ${
                              m.membership_level === "VIP" || m.membership_level === "BLACK_MEMBER"
                                ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                                : "bg-neutral-800 text-neutral-300"
                            }`}
                          >
                            {m.membership_level}
                          </span>
                          <span
                            className={`block text-[0.62rem] font-mono ${
                              m.status === "ACTIVE"
                                ? "text-emerald-400"
                                : m.status === "VIP"
                                ? "text-amber-400"
                                : "text-neutral-500"
                            }`}
                          >
                            ● {m.status}
                          </span>
                        </div>
                      </td>

                      {/* Engagement Score */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 text-sm">
                            {m.engagement_score}
                          </span>
                          <span className="text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                            {m.engagement_category.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>

                      {/* Participation Details */}
                      <td className="p-4 font-mono text-[0.68rem] text-neutral-400">
                        <div>{m.events_attended_count} eventos asistidos</div>
                        <div>{m.benefits_used_count} beneficios canjeados</div>
                        <div>{m.referrals_confirmed_count} referidos</div>
                      </td>

                      {/* Tags */}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                          {m.tags && m.tags.length > 0 ? (
                            m.tags.map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded bg-neutral-850 text-neutral-300 font-mono text-[0.6rem]"
                              >
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-600 font-mono text-[0.65rem]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* WhatsApp */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Contactar por WhatsApp"
                            className="p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/70 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>

                          {/* Email */}
                          <a
                            href={`mailto:${m.email}?subject=Club%20Bacach%C3%A1%20-%20Membres%C3%ADa%20%23${m.member_number}`}
                            title="Enviar Correo"
                            className="p-1.5 rounded-lg bg-neutral-850 text-neutral-400 hover:text-white transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>

                          {/* Edit quick */}
                          <button
                            onClick={() => {
                              setEditMember(m);
                              setEditStatus(m.status);
                              setEditLevel(m.membership_level);
                            }}
                            title="Editar Nivel / Estado"
                            className="p-1.5 rounded-lg bg-neutral-850 text-neutral-400 hover:text-white transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* View Profile */}
                          <Link
                            href={`/admin/miembros/${m.id}`}
                            title="Ver Perfil Completo"
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-[0.68rem] transition-colors"
                          >
                            Ver →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-neutral-850 flex items-center justify-between text-xs font-mono text-neutral-400">
          <span>
            Página {page} de {totalPages} ({totalCount} miembros)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tag Modal */}
      {tagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <h3 className="text-sm font-semibold text-white font-mono uppercase">
              Asignar Etiqueta ({selectedIds.length} miembros)
            </h3>
            <p className="text-xs text-neutral-400">
              Escribe la etiqueta que deseas agregar a todos los socios seleccionados.
            </p>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Ej: vip-acapulco, embajador, fiesta-playa..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTagModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyTags}
                disabled={taggingLoading || !newTag.trim()}
                className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs font-mono disabled:opacity-50"
              >
                {taggingLoading ? "Asignando..." : "Asignar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quick Modal */}
      {editMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl max-w-md w-full space-y-4">
            <h3 className="text-sm font-semibold text-white font-mono uppercase">
              Modificar Membresía · #{editMember.member_number}
            </h3>
            <p className="text-xs text-neutral-400 font-mono">
              {editMember.first_name} {editMember.last_name} ({editMember.email})
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Nivel de Membresía
                </label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="VIP">VIP</option>
                  <option value="FOUNDING_MEMBER">FOUNDING MEMBER</option>
                  <option value="BLACK_MEMBER">BLACK MEMBER</option>
                </select>
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  Estado de Cuenta
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                >
                  <option value="ACTIVE">ACTIVE (Activo)</option>
                  <option value="VIP">VIP</option>
                  <option value="INACTIVE">INACTIVE (Inactivo)</option>
                  <option value="BLOCKED">BLOCKED (Bloqueado)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-850">
              <button
                onClick={() => setEditMember(null)}
                className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs font-mono disabled:opacity-50"
              >
                {editLoading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
