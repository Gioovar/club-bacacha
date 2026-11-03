"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  History,
  KeyRound,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldOff,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type StaffRole = "MESERO" | "HOSTESS" | "SUPERVISOR" | "GERENTE";
type StaffStatus = "PENDIENTE_ACTIVACION" | "ACTIVO" | "INACTIVO";

interface EmployeeHistoryItem {
  id: string;
  memberId: string;
  memberNumber: string;
  memberName: string;
  shiftDate: string;
  visitNumber: number;
  visitedAt: string;
}

interface StaffEmployeeRow {
  id: string;
  name: string;
  phone: string;
  username: string;
  role: StaffRole;
  status: StaffStatus;
  must_change_password: boolean;
  visits_registered_count: number;
  last_login_at: string | null;
  last_active_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  recent_visits: EmployeeHistoryItem[];
  activity_hours: string[];
}

interface InvitationPayload {
  employeeName: string;
  employeePhone: string;
  role: StaffRole;
  activationUrl: string;
  expiresAt: string;
  whatsappMessage: string;
  whatsappUrl: string | null;
}

const ROLE_OPTIONS: StaffRole[] = [
  "MESERO",
  "HOSTESS",
  "SUPERVISOR",
  "GERENTE",
];

function formatDateTime(iso: string | null): string {
  if (!iso) return "Sin actividad aún";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminEmpleadosPage() {
  const [employees, setEmployees] = useState<StaffEmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal Nuevo Empleado
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>("MESERO");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Modal Invitación por WhatsApp
  const [inviteModal, setInviteModal] = useState<InvitationPayload | null>(
    null
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Modal Contraseña Temporal (Restablecimiento alternativo)
  const [tempPassModal, setTempPassModal] = useState<{
    employeeName: string;
    phone: string;
    username: string;
    tempPassword: string;
    expiresAt: string;
  } | null>(null);

  // Modal Historial de Registros y Horarios del Empleado
  const [historyEmployee, setHistoryEmployee] =
    useState<StaffEmployeeRow | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/employees", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al cargar el directorio de empleados.");
      } else {
        setEmployees(data.employees || []);
      }
    } catch {
      setError("Error de red al consultar empleados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
          role: newRole,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setCreateError(data.error || "No se pudo registrar al empleado.");
        return;
      }

      setShowCreateModal(false);
      setNewName("");
      setNewPhone("");
      setNewRole("MESERO");
      await fetchEmployees();

      // Abrir modal de invitación listo para enviar por WhatsApp
      if (data.invitation && data.employee) {
        setInviteModal({
          employeeName: data.employee.name,
          employeePhone: data.employee.phone,
          role: data.employee.role,
          activationUrl: data.invitation.activationUrl,
          expiresAt: data.invitation.expiresAt,
          whatsappMessage: data.invitation.whatsappMessage,
          whatsappUrl: data.invitation.whatsappUrl,
        });
      }
    } catch {
      setCreateError("Error de conexión al guardar empleado.");
    } finally {
      setCreating(false);
    }
  };

  const handleSendInvitation = async (emp: StaffEmployeeRow) => {
    setActionLoadingId(emp.id);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: emp.id,
          action: "send_invitation",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "No se pudo generar la invitación.");
        return;
      }

      setInviteModal({
        employeeName: emp.name,
        employeePhone: emp.phone,
        role: emp.role,
        activationUrl: data.invitation.activationUrl,
        expiresAt: data.invitation.expiresAt,
        whatsappMessage: data.invitation.whatsappMessage,
        whatsappUrl: data.invitation.whatsappUrl,
      });
    } catch {
      alert("Error al generar enlace de invitación.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAssignTempPassword = async (emp: StaffEmployeeRow) => {
    setActionLoadingId(emp.id);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: emp.id,
          action: "assign_temp_password",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "No se pudo asignar contraseña temporal.");
        return;
      }

      setTempPassModal({
        employeeName: emp.name,
        phone: emp.phone,
        username: emp.username,
        tempPassword: data.tempPassword,
        expiresAt: data.expiresAt,
      });
      await fetchEmployees();
    } catch {
      alert("Error al restablecer acceso.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleActive = async (emp: StaffEmployeeRow) => {
    const isDeactivating = emp.status !== "INACTIVO";
    if (
      isDeactivating &&
      !window.confirm(
        `¿Desactivar el acceso de ${emp.name}? Sus sesiones abiertas en /scanner se cerrarán de inmediato.`
      )
    ) {
      return;
    }

    setActionLoadingId(emp.id);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: emp.id,
          action: isDeactivating ? "deactivate" : "activate",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "No se pudo actualizar el estado del empleado.");
        return;
      }
      await fetchEmployees();
    } catch {
      alert("Error de conexión al actualizar empleado.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeCount = employees.filter((e) => e.status === "ACTIVO").length;
  const pendingCount = employees.filter(
    (e) => e.status === "PENDIENTE_ACTIVACION"
  ).length;
  const totalVisitsByStaff = employees.reduce(
    (acc, e) => acc + (e.visits_registered_count || 0),
    0
  );

  return (
    <div className="p-6 lg:p-10 space-y-8 text-white">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-[#EAB308] font-bold">
            CONTROL OPERATIVO · ACCESOS DE PERSONAL
          </span>
          <h1 className="text-2xl lg:text-3xl font-serif tracking-wide text-white mt-1">
            ADMINISTRACIÓN DE EMPLEADOS Y SCANNER
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Gestiona meseros, hostess, supervisores y gerentes autorizados en{" "}
            <Link
              href="/scanner"
              target="_blank"
              className="text-[#EAB308] hover:underline font-mono"
            >
              bacacha.com/scanner
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/scanner"
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono uppercase tracking-widest text-white flex items-center gap-2 transition-all"
          >
            <QrCode className="w-4 h-4 text-[#EAB308]" />
            Abrir /scanner
            <ExternalLink className="w-3.5 h-3.5 text-white/40" />
          </Link>

          <button
            type="button"
            onClick={() => {
              setCreateError("");
              setShowCreateModal(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-[#EAB308] hover:bg-[#CA8A04] text-black font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-[0_8px_25px_rgba(234,179,8,0.25)] transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo empleado
          </button>
        </div>
      </div>

      {/* KPIs de Equipo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0B0B0B] border border-white/10 rounded-2xl p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/45 block">
            Total Empleados
          </span>
          <span className="text-3xl font-serif font-bold text-white mt-1 block">
            {employees.length}
          </span>
        </div>

        <div className="bg-[#0B0B0B] border border-emerald-500/25 rounded-2xl p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/80 block">
            Empleados Activos
          </span>
          <span className="text-3xl font-serif font-bold text-emerald-400 mt-1 block">
            {activeCount}
          </span>
        </div>

        <div className="bg-[#0B0B0B] border border-amber-500/25 rounded-2xl p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400/80 block">
            Pendientes de Activación
          </span>
          <span className="text-3xl font-serif font-bold text-amber-400 mt-1 block">
            {pendingCount}
          </span>
        </div>

        <div className="bg-[#0B0B0B] border border-[#EAB308]/25 rounded-2xl p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#EAB308] block">
            Visitas Registradas por Staff
          </span>
          <span className="text-3xl font-serif font-bold text-[#EAB308] mt-1 block">
            {totalVisitsByStaff}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Directorio de Empleados */}
      <div className="bg-[#0B0B0B] border border-white/10 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#EAB308]" />
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-white font-bold">
              Directorio de Personal ({employees.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={fetchEmployees}
            className="text-xs font-mono text-white/50 hover:text-white flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-[#EAB308] animate-spin" />
            <span className="text-xs font-mono uppercase tracking-widest text-white/40">
              Cargando empleados reales desde Supabase...
            </span>
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EAB308]/10 border border-[#EAB308]/30 flex items-center justify-center mx-auto text-[#EAB308]">
              <UserPlus className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <p className="text-base font-medium text-white">
                Aún no hay empleados registrados en el sistema de Scanner
              </p>
              <p className="text-xs text-white/50">
                Presiona &quot;Nuevo empleado&quot; para dar de alta a tu primer
                mesero, hostess, supervisor o gerente y enviarle su invitación
                de activación por WhatsApp.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#EAB308] hover:bg-[#CA8A04] text-black font-mono text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo empleado
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/45">
                  <th className="py-3.5 px-5">Empleado</th>
                  <th className="py-3.5 px-4">Teléfono / Usuario</th>
                  <th className="py-3.5 px-4">Puesto (Rol)</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Visitas Registradas</th>
                  <th className="py-3.5 px-4">Actividad / Horarios</th>
                  <th className="py-3.5 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {employees.map((emp) => {
                  const isBusy = actionLoadingId === emp.id;
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-4 px-5">
                        <p className="font-bold text-white">{emp.name}</p>
                        <p className="text-[11px] text-white/40 font-mono">
                          Alta:{" "}
                          {new Date(emp.created_at).toLocaleDateString("es-MX")}
                        </p>
                      </td>

                      <td className="py-4 px-4 font-mono text-xs">
                        <p className="text-white/90 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#EAB308]" />
                          {emp.phone}
                        </p>
                        <p className="text-white/45 mt-0.5">
                          Usuario: {emp.username}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-[#EAB308]/15 text-[#EAB308] border border-[#EAB308]/30">
                          {emp.role}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {emp.status === "ACTIVO" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            ACTIVO
                          </span>
                        ) : emp.status === "PENDIENTE_ACTIVACION" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            PENDIENTE DE ACTIVACIÓN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
                            INACTIVO
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-serif font-bold text-[#EAB308]">
                            {emp.visits_registered_count || 0}
                          </span>
                          <span className="text-xs text-white/45">visitas</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <p className="text-white/75">
                          Últ. actividad: {formatDateTime(emp.last_active_at)}
                        </p>
                        {emp.activity_hours && emp.activity_hours.length > 0 && (
                          <p className="text-[11px] font-mono text-[#EAB308]/80 mt-0.5">
                            Horarios frec.: {emp.activity_hours.join(", ")}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Botón Enviar Invitación por WhatsApp */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleSendInvitation(emp)}
                            title="Generar enlace de activación y enviar invitación por WhatsApp"
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Enviar invitación
                          </button>

                          {/* Botón Restablecer Acceso (Contraseña temporal única con caducidad) */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAssignTempPassword(emp)}
                            title="Asignar contraseña temporal que caduca y obliga a cambiarla al primer inicio"
                            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-[11px] font-mono flex items-center gap-1"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-[#EAB308]" />
                            Restablecer
                          </button>

                          {/* Botón Historial del Empleado */}
                          <button
                            type="button"
                            onClick={() => setHistoryEmployee(emp)}
                            title="Consultar historial de visitas registradas y horarios"
                            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-[11px] font-mono flex items-center gap-1"
                          >
                            <History className="w-3.5 h-3.5" />
                            Historial
                          </button>

                          {/* Desactivar / Reactivar */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleActive(emp)}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-all ${
                              emp.status === "INACTIVO"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                                : "bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                            }`}
                          >
                            {emp.status === "INACTIVO"
                              ? "Reactivar"
                              : "Desactivar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================================
         MODAL: NUEVO EMPLEADO
         ====================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0C0C0C] border border-white/15 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#EAB308] font-bold">
                  ALTA DE PERSONAL
                </span>
                <h3 className="text-lg font-serif text-white">
                  Nuevo Empleado
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-white/55 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full bg-black border border-white/15 focus:border-[#EAB308] rounded-xl px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-white/55 mb-1.5">
                  Teléfono (WhatsApp)
                </label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Ej. 7441234567"
                  className="w-full bg-black border border-white/15 focus:border-[#EAB308] rounded-xl px-4 py-3 text-sm text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-white/55 mb-1.5">
                  Puesto / Rol
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as StaffRole)}
                  className="w-full bg-black border border-white/15 focus:border-[#EAB308] rounded-xl px-4 py-3 text-sm text-white outline-none font-mono"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-white/55">
                Se creará el registro real en Supabase con estado{" "}
                <strong className="text-amber-300 font-mono">
                  PENDIENTE DE ACTIVACIÓN
                </strong>{" "}
                y se generará su enlace firmado de invitación para WhatsApp.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono uppercase tracking-widest text-white/70"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-[#EAB308] hover:bg-[#CA8A04] disabled:opacity-50 text-black font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Guardar y Generar Invitación
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================
         2. MODAL: INVITACIÓN POR WHATSAPP (ENLACE FIRMADO DE UN SOLO USO)
         ====================================================================== */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0C0C0C] border border-[#EAB308]/35 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                  INVITACIÓN DE UN SOLO USO GENERADA
                </span>
                <h3 className="text-lg font-serif text-white">
                  Enviar Invitación a {inviteModal.employeeName}
                </h3>
              </div>
              <button
                onClick={() => setInviteModal(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50">
                Enlace de activación individual (caduca en 48h):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteModal.activationUrl}
                  className="flex-1 bg-black border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#EAB308] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteModal.activationUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono text-white flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedLink ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                  Mensaje de WhatsApp:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteModal.whatsappMessage);
                    setCopiedMsg(true);
                    setTimeout(() => setCopiedMsg(false), 2000);
                  }}
                  className="text-[10px] font-mono text-[#EAB308] hover:underline"
                >
                  {copiedMsg ? "✓ Mensaje copiado" : "Copiar texto"}
                </button>
              </div>
              <pre className="bg-black border border-white/10 rounded-2xl p-4 text-xs text-white/85 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                {inviteModal.whatsappMessage}
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {inviteModal.whatsappUrl && (
                <a
                  href={inviteModal.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(16,185,129,0.3)]"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar por WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => setInviteModal(null)}
                className="py-3.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono uppercase tracking-widest text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
         MODAL: CONTRASEÑA TEMPORAL ÚNICA (OBLIGA CAMBIO AL PRIMER INICIO)
         ====================================================================== */}
      {tempPassModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0C0C0C] border border-[#EAB308]/35 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#EAB308] font-bold">
                  RESTABLECIMIENTO TEMPORAL
                </span>
                <h3 className="text-base font-serif text-white">
                  Acceso Temporal para {tempPassModal.employeeName}
                </h3>
              </div>
              <button
                onClick={() => setTempPassModal(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-white/65 leading-relaxed">
              Esta contraseña temporal es única, caduca en 24 horas y{" "}
              <strong className="text-white">
                obligará al empleado a cambiarla por una propia en su primer
                inicio de sesión
              </strong>
              .
            </p>

            <div className="bg-black border border-white/15 rounded-2xl p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-white/45">Teléfono / Usuario:</span>
                <span className="text-white">
                  {tempPassModal.phone} ({tempPassModal.username})
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/10">
                <span className="text-white/45">Contraseña Temporal:</span>
                <span className="text-sm font-bold text-[#EAB308] bg-[#EAB308]/10 px-2.5 py-1 rounded">
                  {tempPassModal.tempPassword}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTempPassModal(null)}
              className="w-full py-3 rounded-xl bg-[#EAB308] hover:bg-[#CA8A04] text-black font-mono text-xs font-bold uppercase tracking-widest"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================
         MODAL: HISTORIAL DE REGISTROS Y HORARIOS DEL EMPLEADO
         ====================================================================== */}
      {historyEmployee && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#0C0C0C] border border-white/15 rounded-3xl p-6 space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#EAB308] font-bold">
                  HISTORIAL OPERATIVO · {historyEmployee.role}
                </span>
                <h3 className="text-lg font-serif text-white">
                  {historyEmployee.name} —{" "}
                  {historyEmployee.visits_registered_count || 0} visitas
                  registradas
                </h3>
              </div>
              <button
                onClick={() => setHistoryEmployee(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-black border border-white/10 rounded-xl p-3">
                <span className="text-white/45 block font-mono text-[10px] uppercase">
                  Último inicio de sesión
                </span>
                <span className="text-white font-medium mt-0.5 block">
                  {formatDateTime(historyEmployee.last_login_at)}
                </span>
              </div>
              <div className="bg-black border border-white/10 rounded-xl p-3">
                <span className="text-white/45 block font-mono text-[10px] uppercase">
                  Horarios de mayor actividad
                </span>
                <span className="text-[#EAB308] font-mono font-bold mt-0.5 block">
                  {historyEmployee.activity_hours?.length
                    ? historyEmployee.activity_hours.join(", ")
                    : "Sin registros aún"}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {!historyEmployee.recent_visits ||
              historyEmployee.recent_visits.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-8 font-mono">
                  Este empleado aún no ha registrado visitas en el scanner.
                </p>
              ) : (
                historyEmployee.recent_visits.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl bg-black border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">
                        <span className="text-[#EAB308] font-mono mr-2">
                          #{String(v.memberNumber).padStart(6, "0")}
                        </span>
                        {v.memberName}
                      </p>
                      <p className="text-[10px] text-white/45 font-mono mt-0.5">
                        Jornada: {v.shiftDate} · {formatDateTime(v.visitedAt)}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px]">
                      Visita #{v.visitNumber}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
