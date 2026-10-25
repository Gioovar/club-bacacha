"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  Gift,
  Plus,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Tag,
  Clock,
  Sparkles,
  Users,
  Search,
  Filter,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Archive,
  ArrowUpRight,
  Upload,
  X,
  Calendar,
  MapPin,
  Coins,
  ShieldCheck,
  Check,
  AlertTriangle,
  FileText,
  Phone,
  MessageCircle,
} from "lucide-react";

interface BenefitItem {
  id: string;
  slug: string;
  title: string;
  phrase: string;
  description: string | null;
  image_url: string;
  active: boolean;
  status: "published" | "draft" | "archived";
  benefit_type: "MEMBER_PROMO" | "EVENT_PROMO" | "POINTS_REWARD" | "BIRTHDAY_BENEFIT";
  event_id: string | null;
  associated_event?: { id: string; name: string; event_date: string; status: string } | null;
  points_cost: number;
  points_award: number;
  venue: string;
  terms: string;
  starts_at: string | null;
  ends_at: string | null;
  stock: number | null;
  max_redemptions_per_member: number;
  redemptions_count: number;
  metadata?: any;
}

interface MemberLookup {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  status: string;
  birthdate?: string | null;
  points_balance: number;
  redemptions_history?: any[];
}

export default function AdminBenefitsPage() {
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsList, setEventsList] = useState<any[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Summary Metrics
  const [metrics, setMetrics] = useState({
    totalCount: 0,
    publishedCount: 0,
    totalRedemptions: 0,
    rewardsCount: 0,
  });

  // Modals state
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Selected Benefit for viewing or deleting
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitItem | null>(null);
  const [benefitRedemptions, setBenefitRedemptions] = useState<any[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);

  // Form State (New or Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    phrase: "",
    description: "",
    benefit_type: "MEMBER_PROMO" as "MEMBER_PROMO" | "EVENT_PROMO" | "POINTS_REWARD" | "BIRTHDAY_BENEFIT",
    event_id: "",
    points_cost: 0,
    points_award: 0,
    image_url: "/images/gran_inauguracion.png",
    venue: "Costera Miguel Alemán · Acapulco",
    terms: "",
    starts_at: "",
    ends_at: "",
    stock: "",
    max_redemptions_per_member: "1",
    status: "draft" as "draft" | "published",
  });
  const [submittingForm, setSubmittingForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redeem Engine State
  const [identifierInput, setIdentifierInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [selectedBenefitIdForRedeem, setSelectedBenefitIdForRedeem] = useState("");
  const [memberLookup, setMemberLookup] = useState<MemberLookup | null>(null);
  const [searchingMember, setSearchingMember] = useState(false);
  const [memberSearchError, setMemberSearchError] = useState<string | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    message: string;
    voucherCode?: string;
    member?: any;
    pointsSpent?: number;
    pointsAwarded?: number;
    newBalance?: number;
  } | null>(null);

  // Delete modal state
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch benefits
  const fetchBenefits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/admin/benefits?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBenefits(data.benefits || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Error fetching benefits:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch events for association
  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/admin/events?status=all");
      if (res.ok) {
        const data = await res.json();
        setEventsList(data.events || []);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  useEffect(() => {
    fetchBenefits();
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Quick Action: Publish / Unpublish / Archive
  const handleQuickAction = async (id: string, action: "publish" | "unpublish" | "archive") => {
    try {
      const res = await fetch("/api/admin/benefits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        fetchBenefits();
      }
    } catch (err) {
      console.error("Quick action error:", err);
    }
  };

  // Duplicate Benefit
  const handleDuplicate = async (benefit: BenefitItem) => {
    try {
      const res = await fetch("/api/admin/benefits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", sourceBenefitId: benefit.id }),
      });
      if (res.ok) {
        fetchBenefits();
      }
    } catch (err) {
      console.error("Duplicate error:", err);
    }
  };

  // Image Upload Handler
  const handleFileUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/benefits/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setFormData((prev) => ({ ...prev, image_url: data.url }));
      } else {
        alert(data.error || "Error al subir flyer");
      }
    } catch (err) {
      alert("Error de conexión al subir flyer");
    } finally {
      setUploadingImage(false);
    }
  };

  // Open Form for New Benefit
  const handleOpenNew = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      title: "",
      phrase: "",
      description: "",
      benefit_type: "MEMBER_PROMO",
      event_id: eventsList.length > 0 ? eventsList[0].id : "",
      points_cost: 0,
      points_award: 0,
      image_url: "/images/gran_inauguracion.png",
      venue: "Costera Miguel Alemán · Acapulco",
      terms: "Válido para miembros de Club Bacachá mostrando membresía digital.",
      starts_at: "",
      ends_at: "",
      stock: "",
      max_redemptions_per_member: "1",
      status: "draft",
    });
    setFormModalOpen(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (benefit: BenefitItem) => {
    setIsEditing(true);
    setEditingId(benefit.id);
    setFormData({
      title: benefit.title,
      phrase: benefit.phrase,
      description: benefit.description || "",
      benefit_type: benefit.benefit_type || "MEMBER_PROMO",
      event_id: benefit.event_id || "",
      points_cost: benefit.points_cost || 0,
      points_award: benefit.points_award || 0,
      image_url: benefit.image_url || "/images/gran_inauguracion.png",
      venue: benefit.venue || "Costera Miguel Alemán · Acapulco",
      terms: benefit.terms || "",
      starts_at: benefit.starts_at ? benefit.starts_at.slice(0, 10) : "",
      ends_at: benefit.ends_at ? benefit.ends_at.slice(0, 10) : "",
      stock: benefit.stock ? String(benefit.stock) : "",
      max_redemptions_per_member: String(benefit.max_redemptions_per_member || 1),
      status: benefit.status === "published" ? "published" : "draft",
    });
    setFormModalOpen(true);
  };

  // Submit Benefit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.phrase.trim()) {
      alert("El título y la frase editorial son obligatorios");
      return;
    }

    setSubmittingForm(true);
    try {
      const payload: any = {
        title: formData.title.trim(),
        phrase: formData.phrase.trim(),
        description: formData.description.trim() || null,
        benefit_type: formData.benefit_type,
        event_id: formData.benefit_type === "EVENT_PROMO" && formData.event_id ? formData.event_id : null,
        points_cost: formData.benefit_type === "POINTS_REWARD" ? Number(formData.points_cost) || 0 : 0,
        points_award: Number(formData.points_award) || 0,
        image_url: formData.image_url,
        venue: formData.venue.trim(),
        terms: formData.terms.trim(),
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
        stock: formData.stock ? Number(formData.stock) : null,
        max_redemptions_per_member: Number(formData.max_redemptions_per_member) || 1,
        status: formData.status,
      };

      let res;
      if (isEditing && editingId) {
        res = await fetch("/api/admin/benefits", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        res = await fetch("/api/admin/benefits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setFormModalOpen(false);
        fetchBenefits();
      } else {
        const data = await res.json();
        alert(data.error || "Error al guardar beneficio");
      }
    } catch (err) {
      alert("Error de conexión al guardar");
    } finally {
      setSubmittingForm(false);
    }
  };

  // View Details & Redemptions
  const handleOpenDetail = async (benefit: BenefitItem) => {
    setSelectedBenefit(benefit);
    setDetailModalOpen(true);
    setLoadingRedemptions(true);
    try {
      const res = await fetch(`/api/admin/benefits/${benefit.id}`);
      if (res.ok) {
        const data = await res.json();
        setBenefitRedemptions(data.redemptions || []);
      }
    } catch (err) {
      console.error("Error loading redemptions:", err);
    } finally {
      setLoadingRedemptions(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (benefit: BenefitItem) => {
    setSelectedBenefit(benefit);
    setDeleteError(null);
    setDeleteConfirmationText("");
    setDeleteModalOpen(true);
  };

  // Execute Delete or Archive
  const handleConfirmDelete = async () => {
    if (!selectedBenefit) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/benefits/${selectedBenefit.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok) {
        setDeleteModalOpen(false);
        fetchBenefits();
      } else {
        setDeleteError(data.error || "No se pudo eliminar el beneficio");
      }
    } catch (err) {
      setDeleteError("Error de comunicación al intentar eliminar");
    } finally {
      setIsDeleting(false);
    }
  };

  // Member Search in Redeem Modal
  const handleSearchMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierInput.trim()) return;

    setSearchingMember(true);
    setMemberSearchError(null);
    setMemberLookup(null);

    try {
      const res = await fetch(`/api/admin/benefits/redeem?identifier=${encodeURIComponent(identifierInput.trim())}`);
      const data = await res.json();
      if (res.ok && data.member) {
        setMemberLookup(data.member);
      } else {
        setMemberSearchError(data.error || "No se encontró ningún socio con ese identificador");
      }
    } catch (err) {
      setMemberSearchError("Error de conexión al buscar socio");
    } finally {
      setSearchingMember(false);
    }
  };

  // Execute Redeem
  const handlePerformRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBenefitIdForRedeem || !memberLookup) return;

    setRedeemLoading(true);
    setRedeemResult(null);

    try {
      const res = await fetch("/api/admin/benefits/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          benefitId: selectedBenefitIdForRedeem,
          memberId: memberLookup.id,
          notes: notesInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRedeemResult({
          success: true,
          message: data.message,
          voucherCode: data.voucherCode,
          member: data.member,
          pointsSpent: data.pointsSpent,
          pointsAwarded: data.pointsAwarded,
          newBalance: data.member?.new_balance,
        });
        // Update member points locally
        setMemberLookup((prev) => prev ? { ...prev, points_balance: data.member?.new_balance } : null);
        setNotesInput("");
        fetchBenefits();
      } else {
        setRedeemResult({
          success: false,
          message: data.error || "Error al procesar el canje",
        });
      }
    } catch {
      setRedeemResult({
        success: false,
        message: "Error de conexión con el servidor",
      });
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-850">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-serif tracking-tight text-white uppercase">
              BENEFICIOS, PROMOCIONES & CANJES
            </h1>
          </div>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Promociones exclusivas · Recompensas por puntos · Trazabilidad de canjes reales
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (benefits.length > 0 && !selectedBenefitIdForRedeem) {
                const activeOnes = benefits.filter((b) => b.active);
                setSelectedBenefitIdForRedeem(activeOnes.length > 0 ? activeOnes[0].id : benefits[0].id);
              }
              setIdentifierInput("");
              setMemberLookup(null);
              setRedeemResult(null);
              setRedeemModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono flex items-center gap-2 transition-colors shadow-lg shadow-amber-400/10 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Canjear Beneficio a Socio</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs flex items-center gap-2 transition-colors cursor-pointer border border-neutral-750"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Nuevo Beneficio</span>
          </button>
        </div>
      </div>

      {/* Real Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <div className="text-[0.68rem] font-mono text-neutral-400 uppercase tracking-wider">
            Total Beneficios
          </div>
          <div className="text-2xl font-serif font-bold text-white mt-1">
            {metrics.totalCount}
          </div>
          <div className="text-[0.65rem] font-mono text-neutral-500 mt-1">
            Registrados en el sistema
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <div className="text-[0.68rem] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            En Landing (Publicados)
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-400 mt-1">
            {metrics.publishedCount}
          </div>
          <div className="text-[0.65rem] font-mono text-neutral-500 mt-1">
            Visibles para miembros
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <div className="text-[0.68rem] font-mono text-amber-400 uppercase tracking-wider">
            Canjes Realizados
          </div>
          <div className="text-2xl font-serif font-bold text-amber-400 mt-1">
            {metrics.totalRedemptions}
          </div>
          <div className="text-[0.65rem] font-mono text-neutral-500 mt-1">
            Histórico en base de datos
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850">
          <div className="text-[0.68rem] font-mono text-purple-400 uppercase tracking-wider">
            Premios por Puntos
          </div>
          <div className="text-2xl font-serif font-bold text-purple-400 mt-1">
            {metrics.rewardsCount}
          </div>
          <div className="text-[0.65rem] font-mono text-neutral-500 mt-1">
            Catálogo con costo en puntos
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-850 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, frase, sucursal o condiciones..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-neutral-900 rounded-xl p-1 border border-neutral-800 text-[0.7rem] font-mono">
            {[
              { id: "all", label: "Todos" },
              { id: "published", label: "Publicados" },
              { id: "draft", label: "Borradores" },
              { id: "archived", label: "Archivados" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-amber-400 text-black font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Type Filter Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">Todos los Tipos</option>
            <option value="MEMBER_PROMO">🏷️ Promoción Miembro</option>
            <option value="EVENT_PROMO">🎟️ Promoción de Evento</option>
            <option value="POINTS_REWARD">🏆 Premio por Puntos</option>
            <option value="BIRTHDAY_BENEFIT">🎂 Cumpleaños</option>
          </select>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-xs font-mono text-neutral-500">
            Cargando catálogo oficial de beneficios...
          </div>
        ) : benefits.length === 0 ? (
          <div className="col-span-full py-16 text-center border border-dashed border-neutral-800 rounded-2xl p-8 bg-neutral-950/50">
            <Gift className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white font-mono uppercase mb-1">
              No se encontraron beneficios
            </h3>
            <p className="text-xs text-neutral-400 font-mono max-w-sm mx-auto mb-4">
              {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                ? "No hay resultados para los filtros seleccionados."
                : "Todavía no hay promociones creadas. Comienza agregando la primera."}
            </p>
            <button
              onClick={handleOpenNew}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs font-mono inline-flex items-center gap-2 hover:bg-amber-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Nuevo Beneficio</span>
            </button>
          </div>
        ) : (
          benefits.map((b) => {
            const isPointsReward = b.benefit_type === "POINTS_REWARD";
            const isEventPromo = b.benefit_type === "EVENT_PROMO";
            const isBirthday = b.benefit_type === "BIRTHDAY_BENEFIT";

            return (
              <div
                key={b.id}
                className={`rounded-2xl bg-neutral-950 border transition-all flex flex-col justify-between overflow-hidden shadow-xl ${
                  b.active
                    ? "border-neutral-800 hover:border-amber-400/50"
                    : b.status === "archived"
                    ? "border-neutral-900 opacity-60"
                    : "border-neutral-850 hover:border-neutral-700"
                }`}
              >
                {/* Visual Flyer Banner */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900 border-b border-neutral-850">
                  <Image
                    src={b.image_url || "/images/gran_inauguracion.png"}
                    alt={b.title}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 420px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

                  {/* Status & Type Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[0.62rem] font-mono font-semibold uppercase ${
                        b.status === "published"
                          ? "bg-emerald-950/90 border border-emerald-500/40 text-emerald-300"
                          : b.status === "archived"
                          ? "bg-neutral-900 border border-neutral-700 text-neutral-400"
                          : "bg-amber-950/90 border border-amber-500/40 text-amber-300"
                      }`}
                    >
                      {b.status === "published" ? "PUBLICADO" : b.status === "archived" ? "ARCHIVADO" : "BORRADOR"}
                    </span>

                    {/* Type Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[0.62rem] font-mono uppercase font-semibold ${
                        isPointsReward
                          ? "bg-purple-950/90 border border-purple-500/40 text-purple-300"
                          : isEventPromo
                          ? "bg-blue-950/90 border border-blue-500/40 text-blue-300"
                          : isBirthday
                          ? "bg-pink-950/90 border border-pink-500/40 text-pink-300"
                          : "bg-neutral-900/90 border border-neutral-700 text-neutral-300"
                      }`}
                    >
                      {isPointsReward
                        ? "🏆 Premio x Puntos"
                        : isEventPromo
                        ? "🎟️ Promoción Evento"
                        : isBirthday
                        ? "🎂 Cumpleaños"
                        : "🏷️ Promo Miembro"}
                    </span>
                  </div>

                  {/* Associated Event Pill if present */}
                  {b.associated_event && (
                    <div className="absolute bottom-3 left-3 max-w-[85%] truncate">
                      <span className="px-2 py-0.5 rounded text-[0.6rem] font-mono bg-black/80 border border-amber-400/40 text-amber-300 flex items-center gap-1 truncate">
                        <Calendar className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{b.associated_event.name}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Body */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-base font-serif font-bold text-white uppercase tracking-tight line-clamp-1">
                      {b.title}
                    </h3>

                    <p className="text-xs text-amber-300/90 font-mono italic line-clamp-2">
                      &ldquo;{b.phrase}&rdquo;
                    </p>

                    {b.description && (
                      <p className="text-xs text-neutral-400 font-sans leading-relaxed line-clamp-2">
                        {b.description}
                      </p>
                    )}
                  </div>

                  {/* Rules & Metrics */}
                  <div className="pt-3 border-t border-neutral-900 space-y-2 text-[0.68rem] font-mono">
                    {/* Points Rule */}
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Regla de Puntos:</span>
                      <span className={`font-semibold ${isPointsReward ? "text-purple-400" : "text-neutral-300"}`}>
                        {isPointsReward
                          ? `💎 ${b.points_cost} pts requeridos`
                          : b.points_award > 0
                          ? `🎁 +${b.points_award} pts de bono`
                          : "Sin costo en puntos"}
                      </span>
                    </div>

                    {/* Real Redemptions Count */}
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Canjes Realizados:</span>
                      <span className="text-amber-400 font-semibold">
                        {b.redemptions_count} canje{b.redemptions_count === 1 ? "" : "s"}
                      </span>
                    </div>

                    {/* Stock if applicable */}
                    {b.stock !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Existencias Disponibles:</span>
                        <span className="text-neutral-300 font-semibold">{b.stock} unidades</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="p-4 bg-neutral-900/50 border-t border-neutral-850 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* View Details */}
                    <button
                      onClick={() => handleOpenDetail(b)}
                      title="Ver detalle y canjes"
                      className="p-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(b)}
                      title="Editar beneficio"
                      className="p-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicate(b)}
                      title="Duplicar beneficio"
                      className="p-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleOpenDelete(b)}
                      title="Eliminar o archivar"
                      className="p-1.5 rounded-lg bg-neutral-850 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Direct Redeem */}
                    {b.active && (
                      <button
                        onClick={() => {
                          setSelectedBenefitIdForRedeem(b.id);
                          setIdentifierInput("");
                          setMemberLookup(null);
                          setRedeemResult(null);
                          setRedeemModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-amber-400 text-amber-300 hover:text-black text-[0.68rem] font-mono font-semibold transition-colors border border-amber-400/20 cursor-pointer"
                      >
                        Canjear
                      </button>
                    )}

                    {/* Publish / Unpublish Toggle */}
                    {b.active ? (
                      <button
                        onClick={() => handleQuickAction(b.id, "unpublish")}
                        className="px-2.5 py-1 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-400 text-[0.68rem] font-mono transition-colors cursor-pointer"
                      >
                        Despublicar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleQuickAction(b.id, "publish")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[0.68rem] font-mono font-semibold transition-colors cursor-pointer"
                      >
                        Publicar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: FORMULARIO NUEVO / EDITAR BENEFICIO                        */}
      {/* ==================================================================== */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-2xl w-full my-8 p-6 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-850">
              <div>
                <h3 className="text-base font-serif font-bold text-white uppercase flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-400" />
                  <span>{isEditing ? "EDITAR BENEFICIO" : "CREAR NUEVO BENEFICIO"}</span>
                </h3>
                <p className="text-xs font-mono text-neutral-400 mt-0.5">
                  Configuración de promociones, dinámicas de evento y recompensas oficiales
                </p>
              </div>
              <button
                onClick={() => setFormModalOpen(false)}
                className="text-neutral-500 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-6">
              {/* Sección A: Tipo de Beneficio & Datos Principales */}
              <div className="space-y-4">
                <div className="text-[0.68rem] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                  1. Modalidad & Datos Principales
                </div>

                <div>
                  <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1.5">
                    Tipo de Beneficio
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "MEMBER_PROMO", label: "🏷️ Promo Miembro", desc: "Presenta membresía" },
                      { id: "EVENT_PROMO", label: "🎟️ Promo Evento", desc: "Ligado a un evento" },
                      { id: "POINTS_REWARD", label: "🏆 Premio x Puntos", desc: "Descuenta puntos" },
                      { id: "BIRTHDAY_BENEFIT", label: "🎂 Cumpleaños", desc: "Fecha de nacimiento" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, benefit_type: t.id as any })}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                          formData.benefit_type === t.id
                            ? "bg-amber-400/10 border-amber-400 text-white"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                        }`}
                      >
                        <div className="font-mono text-xs font-semibold">{t.label}</div>
                        <div className="text-[0.62rem] text-neutral-400 mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                      Nombre del Beneficio *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ej: Botellas de Edición Especial Club Bacachá"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                      Frase Editorial (Corta y contundente) *
                    </label>
                    <input
                      type="text"
                      value={formData.phrase}
                      onChange={(e) => setFormData({ ...formData, phrase: e.target.value })}
                      placeholder="Ej: Precio exclusivo para miembros en apertura."
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                    Descripción Completa
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Describe los productos participantes, condiciones y experiencia para el socio..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Sección B: Evento Asociado (Si es EVENT_PROMO) */}
              {formData.benefit_type === "EVENT_PROMO" && (
                <div className="space-y-3 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                  <div className="text-[0.68rem] font-mono text-blue-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>2. Evento Oficial Asociado</span>
                  </div>

                  <div>
                    <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                      Seleccionar Evento
                    </label>
                    <select
                      value={formData.event_id}
                      onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                    >
                      <option value="">-- Sin evento específico --</option>
                      {eventsList.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.name} ({evt.event_date}) - {evt.status.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Sección C: Flyer / Imagen Oficial */}
              <div className="space-y-3">
                <div className="text-[0.68rem] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                  {formData.benefit_type === "EVENT_PROMO" ? "3." : "2."} Flyer o Imagen Oficial
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                  <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-neutral-950 shrink-0 border border-neutral-750">
                    <Image
                      src={formData.image_url || "/images/gran_inauguracion.png"}
                      alt="Flyer preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>

                  <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>{uploadingImage ? "Subiendo..." : "Subir Flyer / Imagen"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: "/images/gran_inauguracion.png" })}
                        className="px-3 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-400 text-xs font-mono cursor-pointer"
                      >
                        Póster Inauguración
                      </button>
                    </div>

                    <p className="text-[0.65rem] font-mono text-neutral-500">
                      Formatos soportados: JPG, PNG, WebP (máx. 10 MB). Se almacena de forma persistente en Supabase Storage.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección D: Reglas de Puntos & Inventario */}
              <div className="space-y-4">
                <div className="text-[0.68rem] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                  {formData.benefit_type === "EVENT_PROMO" ? "4." : "3."} Reglas de Puntos & Existencias
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {formData.benefit_type === "POINTS_REWARD" ? (
                    <div>
                      <label className="block text-[0.68rem] font-mono text-purple-400 uppercase mb-1">
                        Costo en Puntos *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.points_cost}
                        onChange={(e) => setFormData({ ...formData, points_cost: Number(e.target.value) })}
                        placeholder="Ej: 150"
                        className="w-full bg-neutral-900 border border-purple-500/50 rounded-xl p-2.5 text-xs text-white font-mono"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                        Puntos de Bonificación (Opcional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.points_award}
                        onChange={(e) => setFormData({ ...formData, points_award: Number(e.target.value) })}
                        placeholder="0 para solo beneficio comercial"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                      Límite x Miembro
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.max_redemptions_per_member}
                      onChange={(e) => setFormData({ ...formData, max_redemptions_per_member: e.target.value })}
                      placeholder="Ej: 1"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                      Stock / Existencias Globales
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="Dejar vacío si es ilimitado"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                      Establecimiento / Sucursal
                    </label>
                    <input
                      type="text"
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      placeholder="Ej: Barra Principal & Mesas · Costera Miguel Alemán"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                      Estado Inicial
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                    >
                      <option value="draft">Borrador (Solo visible en dashboard)</option>
                      <option value="published">Publicado (Visible en landing y app)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                    Términos y Condiciones
                  </label>
                  <textarea
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    rows={2}
                    placeholder="Válido en noche de apertura presentando credencial de socio. Sujeto a disponibilidad..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-850">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer shadow-lg shadow-amber-400/10 disabled:opacity-50"
                >
                  {submittingForm ? "Guardando..." : isEditing ? "Actualizar Beneficio" : "Crear Beneficio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: CANJEAR BENEFICIO A SOCIO (MOTOR DE VALIDACIÓN EN VIVO)    */}
      {/* ==================================================================== */}
      {redeemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl max-w-lg w-full space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
              <h3 className="text-sm font-semibold text-white font-mono uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>CANJEAR BENEFICIO A SOCIO</span>
              </h3>
              <button
                onClick={() => {
                  setRedeemModalOpen(false);
                  setRedeemResult(null);
                  setMemberLookup(null);
                }}
                className="text-neutral-500 hover:text-white text-xs font-mono cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {/* Step 1: Identifier Search */}
            <form onSubmit={handleSearchMember} className="space-y-3">
              <div>
                <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                  1. Identificar Socio (QR, #Membresía o Teléfono)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    placeholder="Escanea el código QR o escribe #1284 / teléfono..."
                    autoFocus
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={searchingMember || !identifierInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-mono text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {searchingMember ? "Buscando..." : "Buscar"}
                  </button>
                </div>
              </div>
            </form>

            {/* Member Lookup Error */}
            {memberSearchError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{memberSearchError}</span>
              </div>
            )}

            {/* Member Card if found */}
            {memberLookup && (
              <div className="p-4 rounded-xl bg-neutral-900 border border-amber-400/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-400 text-black font-bold flex items-center justify-center font-mono text-xs">
                      {memberLookup.first_name[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono">
                        {memberLookup.first_name} {memberLookup.last_name}
                      </div>
                      <div className="text-[0.65rem] font-mono text-neutral-400">
                        Socio #{memberLookup.member_number} · {memberLookup.phone || "Sin teléfono"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[0.62rem] font-mono uppercase ${
                        memberLookup.status === "ACTIVE"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-950 text-red-400"
                      }`}
                    >
                      {memberLookup.status === "ACTIVE" ? "MEMBRESÍA ACTIVA" : memberLookup.status}
                    </span>
                    <div className="text-xs font-mono font-bold text-purple-400 mt-1">
                      💎 {memberLookup.points_balance} pts
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Benefit Selection & Confirmation Form */}
            {memberLookup && (
              <form onSubmit={handlePerformRedeem} className="space-y-4">
                <div>
                  <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                    2. Seleccionar Beneficio a Canjear
                  </label>
                  <select
                    value={selectedBenefitIdForRedeem}
                    onChange={(e) => setSelectedBenefitIdForRedeem(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  >
                    {benefits
                      .filter((b) => b.active)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title} ({b.benefit_type === "POINTS_REWARD" ? `${b.points_cost} pts` : "Sin costo en puntos"})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[0.68rem] font-mono text-neutral-400 uppercase mb-1">
                    Nota u Observación (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Ej: Mesa VIP 3, botella de cortesía entregada..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  />
                </div>

                {/* Redeem Result Alert */}
                {redeemResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-mono space-y-1 ${
                      redeemResult.success
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                        : "bg-red-950/60 border-red-500/40 text-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {redeemResult.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>¡CANJE CONFIRMADO EXITOSAMENTE!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span>NO SE PUDO COMPLETAR EL CANJE</span>
                        </>
                      )}
                    </div>
                    <p className="text-[0.7rem] leading-relaxed">{redeemResult.message}</p>
                    {redeemResult.voucherCode && (
                      <div className="mt-2 p-2 bg-black/60 rounded border border-emerald-500/30 text-emerald-400 font-mono text-xs flex justify-between">
                        <span>Código de Canje:</span>
                        <span className="font-bold tracking-wider">{redeemResult.voucherCode}</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={redeemLoading || !selectedBenefitIdForRedeem}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-amber-400/10"
                >
                  {redeemLoading ? "Validando Reglas & Saldo..." : "Confirmar Canje"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: VER DETALLE DEL BENEFICIO & HISTORIAL DE CANJES            */}
      {/* ==================================================================== */}
      {detailModalOpen && selectedBenefit && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-3xl w-full my-8 p-6 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-neutral-850">
              <div>
                <span className="text-[0.65rem] font-mono uppercase px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30">
                  {selectedBenefit.benefit_type}
                </span>
                <h3 className="text-lg font-serif font-bold text-white uppercase mt-1">
                  {selectedBenefit.title}
                </h3>
                <p className="text-xs text-amber-300/90 font-mono italic">
                  &ldquo;{selectedBenefit.phrase}&rdquo;
                </p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-neutral-500 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Flyer & Metadata Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
                <Image
                  src={selectedBenefit.image_url || "/images/gran_inauguracion.png"}
                  alt={selectedBenefit.title}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>

              <div className="sm:col-span-2 space-y-2 text-xs font-mono">
                <div className="text-neutral-400">
                  <span className="text-neutral-500">Establecimiento:</span> {selectedBenefit.venue}
                </div>
                <div className="text-neutral-400">
                  <span className="text-neutral-500">Regla de Puntos:</span>{" "}
                  {selectedBenefit.benefit_type === "POINTS_REWARD"
                    ? `Requiere ${selectedBenefit.points_cost} puntos`
                    : selectedBenefit.points_award > 0
                    ? `Bonifica +${selectedBenefit.points_award} puntos`
                    : "Promoción comercial directa (0 pts)"}
                </div>
                <div className="text-neutral-400">
                  <span className="text-neutral-500">Límite por Socio:</span>{" "}
                  {selectedBenefit.max_redemptions_per_member
                    ? `${selectedBenefit.max_redemptions_per_member} canje(s)`
                    : "Ilimitado"}
                </div>
                {selectedBenefit.terms && (
                  <div className="p-2.5 rounded-lg bg-neutral-900 text-neutral-400 text-[0.68rem] leading-relaxed border border-neutral-850">
                    <span className="text-neutral-300 font-bold block mb-0.5">Términos & Condiciones:</span>
                    {selectedBenefit.terms}
                  </div>
                )}
              </div>
            </div>

            {/* Redemptions Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase text-white font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Historial de Canjes Realizados ({benefitRedemptions.length})</span>
                </h4>
              </div>

              {loadingRedemptions ? (
                <div className="py-8 text-center text-xs font-mono text-neutral-500">
                  Cargando trazabilidad de canjes...
                </div>
              ) : benefitRedemptions.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-neutral-500 border border-neutral-900 rounded-xl bg-neutral-900/30">
                  Todavía no se registran canjes para este beneficio.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-60 rounded-xl border border-neutral-850">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-neutral-900 text-neutral-400 text-[0.65rem] uppercase sticky top-0">
                      <tr>
                        <th className="p-2.5">Fecha</th>
                        <th className="p-2.5">Socio</th>
                        <th className="p-2.5">Membresía</th>
                        <th className="p-2.5">Teléfono / WhatsApp</th>
                        <th className="p-2.5">Código Voucher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-neutral-300">
                      {benefitRedemptions.map((r) => (
                        <tr key={r.id} className="hover:bg-neutral-900/50">
                          <td className="p-2.5 text-neutral-500">
                            {new Date(r.redeemed_at).toLocaleDateString("es-MX", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-2.5 font-bold text-white">
                            {r.member?.first_name} {r.member?.last_name}
                          </td>
                          <td className="p-2.5 text-amber-400">
                            #{r.member?.member_number}
                          </td>
                          <td className="p-2.5">
                            {r.member?.phone ? (
                              <a
                                href={`https://wa.me/${r.member.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>{r.member.phone}</span>
                              </a>
                            ) : (
                              "---"
                            )}
                          </td>
                          <td className="p-2.5 text-neutral-400 font-mono">
                            {r.redemption_code || "BAC-CANJE"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: CONFIRMAR ELIMINACIÓN SEGURA                               */}
      {/* ==================================================================== */}
      {deleteModalOpen && selectedBenefit && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold font-mono uppercase">
                Confirmar Eliminación
              </h3>
            </div>

            <p className="text-xs text-neutral-300 font-mono leading-relaxed">
              ¿Estás seguro de que deseas eliminar el beneficio{" "}
              <span className="text-white font-bold">&ldquo;{selectedBenefit.title}&rdquo;</span>?
            </p>

            {deleteError ? (
              <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-mono space-y-2">
                <p className="leading-relaxed">{deleteError}</p>
                <button
                  type="button"
                  onClick={() => {
                    handleQuickAction(selectedBenefit.id, "archive");
                    setDeleteModalOpen(false);
                  }}
                  className="w-full py-2 rounded-lg bg-amber-400 text-black font-bold text-xs font-mono uppercase cursor-pointer hover:bg-amber-300 transition-colors"
                >
                  Archivar Beneficio en su lugar
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-850">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-mono text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs font-mono uppercase cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? "Eliminando..." : "Eliminar Definitivamente"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
