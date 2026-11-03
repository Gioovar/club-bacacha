"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X,
  Download,
  QrCode,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  DEFAULT_WELCOME_TEMPLATE,
  formatMemberBadge,
  formatMemberFullName,
  normalizeWhatsAppPhone,
  renderWelcomeMessage,
  WelcomeHistoryRecord,
  WelcomeStatus,
} from "@/lib/members/welcome";
import {
  generateMemberCredentialPng,
  triggerCredentialDownload,
} from "@/lib/members/credential-canvas";

export interface WelcomeModalMember {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  city: string;
  status: string;
  membership_level: string;
  qr_token?: string;
  created_at: string;
  welcome_status?: WelcomeStatus | null;
  welcome_confirmed?: boolean;
  welcome_sent_at?: string | null;
}

interface Props {
  member: WelcomeModalMember;
  initialGeneralTemplate?: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function WelcomeCredentialModal({
  member,
  initialGeneralTemplate,
  onClose,
  onUpdated,
}: Props) {
  const [qrToken, setQrToken] = useState<string>(member.qr_token || "");
  const [generalTemplate, setGeneralTemplate] = useState<string>(
    initialGeneralTemplate || DEFAULT_WELCOME_TEMPLATE
  );
  const [message, setMessage] = useState<string>(() =>
    renderWelcomeMessage(initialGeneralTemplate || DEFAULT_WELCOME_TEMPLATE, member)
  );

  // Credential PNG state
  const [credentialDataUrl, setCredentialDataUrl] = useState<string>("");
  const [credentialBlob, setCredentialBlob] = useState<Blob | null>(null);
  const [credentialFilename, setCredentialFilename] = useState<string>("");
  const [generatingPng, setGeneratingPng] = useState<boolean>(true);
  const [pngError, setPngError] = useState<string | null>(null);

  // Server state
  const [loadingDetails, setLoadingDetails] = useState<boolean>(true);
  const [whatsappApiConfigured, setWhatsappApiConfigured] = useState<boolean>(false);
  const [history, setHistory] = useState<WelcomeHistoryRecord[]>([]);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  // Clipboard & manual confirmation state
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [awaitingManualConfirm, setAwaitingManualConfirm] = useState<boolean>(false);

  // QR Revocation state
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<boolean>(false);
  const [revokeReason, setRevokeReason] = useState<string>(
    "Solicitud de regeneración por seguridad"
  );
  const [revokingQr, setRevokingQr] = useState<boolean>(false);

  const phoneInfo = normalizeWhatsAppPhone(member.phone);
  const formattedNumber = formatMemberBadge(member.member_number);
  const fullName = formatMemberFullName(member);

  // Generar credencial PNG 1080x1350 cuando tenemos qrToken
  const buildCredentialImage = useCallback(
    async (activeToken: string) => {
      if (!activeToken) return;
      setGeneratingPng(true);
      setPngError(null);
      try {
        const res = await generateMemberCredentialPng({
          id: member.id,
          member_number: member.member_number,
          first_name: member.first_name,
          last_name: member.last_name,
          qr_token: activeToken,
          membership_level: member.membership_level,
          city: member.city,
          created_at: member.created_at,
        });
        setCredentialDataUrl(res.dataUrl);
        setCredentialBlob(res.blob);
        setCredentialFilename(res.filename);
      } catch (err: unknown) {
        setPngError(
          err instanceof Error
            ? err.message
            : "Error al generar la imagen PNG de la credencial."
        );
      } finally {
        setGeneratingPng(false);
      }
    },
    [member]
  );

  // Cargar información actualizada del servidor (token QR, plantilla general, historial)
  useEffect(() => {
    let active = true;
    setLoadingDetails(true);

    fetch(`/api/admin/members/${member.id}/welcome`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const resolvedToken = data.qrToken || member.qr_token || "";
        setQrToken(resolvedToken);
        if (data.generalTemplate) {
          setGeneralTemplate(data.generalTemplate);
          setMessage(renderWelcomeMessage(data.generalTemplate, member));
        }
        setWhatsappApiConfigured(Boolean(data.whatsappApiConfigured));
        setHistory(Array.isArray(data.history) ? data.history : []);
        if (resolvedToken) {
          buildCredentialImage(resolvedToken);
        }
      })
      .catch(() => {
        if (active && member.qr_token) {
          buildCredentialImage(member.qr_token);
        }
      })
      .finally(() => {
        if (active) setLoadingDetails(false);
      });

    return () => {
      active = false;
    };
  }, [member, buildCredentialImage]);

  const handleDownloadPng = async () => {
    if (!credentialDataUrl || !credentialFilename) return;
    triggerCredentialDownload(credentialDataUrl, credentialFilename);

    try {
      const res = await fetch(`/api/admin/members/${member.id}/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "download",
          message,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history)) setHistory(data.history);
        onUpdated();
      }
    } catch {
      // No interrumpir descarga local
    }

    setFeedback({
      type: "success",
      text: `Credencial PNG (${credentialFilename}) descargada en 1080 × 1350 px.`,
    });
  };

  const handleCopyImageToClipboard = async () => {
    if (!credentialBlob) return;
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof ClipboardItem !== "undefined"
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": credentialBlob }),
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 3000);
        setFeedback({
          type: "success",
          text: "Credencial PNG copiada al portapapeles. Puedes pegarla directamente (Cmd+V / Ctrl+V) en el chat de WhatsApp.",
        });
      } else {
        handleDownloadPng();
      }
    } catch {
      handleDownloadPng();
    }
  };

  const handleSendWhatsApp = async () => {
    setFeedback(null);

    if (!phoneInfo.valid) {
      setFeedback({
        type: "error",
        text:
          phoneInfo.error ||
          "El miembro no cuenta con un teléfono válido registrado para WhatsApp.",
      });
      return;
    }

    if (!credentialDataUrl) {
      setFeedback({
        type: "error",
        text: "Espera un momento a que termine de generarse la credencial PNG.",
      });
      return;
    }

    setActionLoading(true);
    try {
      // 1. Si no hay API oficial de WhatsApp Business configurada, descargar PNG (e intentar copiar al portapapeles)
      // y abrir WhatsApp con el mensaje personalizado prellenado.
      if (!whatsappApiConfigured) {
        triggerCredentialDownload(credentialDataUrl, credentialFilename);
        if (
          credentialBlob &&
          typeof navigator !== "undefined" &&
          navigator.clipboard &&
          typeof ClipboardItem !== "undefined"
        ) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": credentialBlob }),
            ]);
          } catch {
            // Ignorar si el navegador bloquea clipboard sin foco directo
          }
        }

        const res = await fetch(`/api/admin/members/${member.id}/welcome`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "prepare_whatsapp",
            message,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setFeedback({
            type: "error",
            text: data.error || "No se pudo preparar el envío por WhatsApp.",
          });
          return;
        }

        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
        onUpdated();

        const targetWaUrl =
          data.waUrl ||
          `https://wa.me/${phoneInfo.normalized}?text=${encodeURIComponent(
            renderWelcomeMessage(message, member)
          )}`;

        window.open(targetWaUrl, "_blank", "noopener,noreferrer");
        setAwaitingManualConfirm(true);
        setFeedback({
          type: "warning",
          text: "Se descargó la credencial PNG y se abrió WhatsApp con el mensaje personalizado. Adjunta o pega la credencial en el chat y confirma el envío abajo cuando lo hayas enviado.",
        });
      } else {
        // Envío mediante WhatsApp Business Cloud API oficial
        const res = await fetch(`/api/admin/members/${member.id}/welcome`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send_whatsapp_api",
            message,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setFeedback({
            type: "error",
            text: data.error || "Error al enviar mediante WhatsApp Business API.",
          });
          return;
        }

        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
        onUpdated();
        setFeedback({
          type: "success",
          text: "Bienvenida enviada y confirmada por WhatsApp Business API.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Error de red al preparar el envío de bienvenida.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmManualSent = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/members/${member.id}/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_manual_sent",
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: data.error || "No se pudo registrar la confirmación de envío.",
        });
        return;
      }

      if (Array.isArray(data.history)) {
        setHistory(data.history);
      }
      setAwaitingManualConfirm(false);
      onUpdated();
      setFeedback({
        type: "success",
        text: "Envío confirmado y registrado en el historial de Supabase.",
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Error al confirmar el envío.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateQr = async () => {
    setRevokingQr(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/members/${member.id}/qr-regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.qrToken) {
        setFeedback({
          type: "error",
          text: data.error || "No se pudo regenerar el código QR.",
        });
        return;
      }

      setQrToken(data.qrToken);
      setShowRevokeConfirm(false);
      await buildCredentialImage(data.qrToken);
      onUpdated();
      setFeedback({
        type: "success",
        text: "El código QR anterior fue revocado y se generó un nuevo QR único para el socio.",
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Error de conexión al regenerar el QR.",
      });
    } finally {
      setRevokingQr(false);
    }
  };

  const hasConfirmedSend =
    history.some((h) => h.status === "enviado" || h.status === "entregado") ||
    Boolean(member.welcome_confirmed);

  const latestStatus: WelcomeStatus =
    history[0]?.status || member.welcome_status || "pendiente";

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-5xl w-full overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.95)] my-auto">
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-850 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm sm:text-base font-serif tracking-wide text-white uppercase">
                  BIENVENIDA Y CREDENCIAL DIGITAL
                </h2>
                <span className="font-mono text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
                  {formattedNumber}
                </span>
                {hasConfirmedSend ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[0.62rem] font-mono uppercase">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Bienvenida Enviada</span>
                  </span>
                ) : latestStatus === "preparado" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[0.62rem] font-mono uppercase">
                    <Clock className="w-3 h-3" />
                    <span>Preparada · Por Confirmar</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 text-[0.62rem] font-mono uppercase">
                    <span>Pendiente</span>
                  </span>
                )}
              </div>
              <p className="text-[0.68rem] font-mono text-neutral-400 mt-0.5">
                Datos sincronizados en tiempo real con Supabase · Credencial oficial 1080 × 1350 px
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-850 max-h-[85vh] overflow-y-auto">
          {/* Left Column: Credential Preview & Download & Security */}
          <div className="lg:col-span-5 p-6 bg-neutral-950 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[0.68rem] font-mono">
                <span className="text-neutral-400 uppercase tracking-wider">
                  VISTA PREVIA DE CREDENCIAL
                </span>
                <span className="text-amber-400/90">PNG · 1080 × 1350 PX</span>
              </div>

              {/* Credential Image Frame */}
              <div className="relative mx-auto w-full max-w-[310px] aspect-[4/5] rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl flex items-center justify-center">
                {generatingPng ? (
                  <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                    <div className="w-7 h-7 border-2 border-neutral-700 border-t-amber-400 rounded-full animate-spin" />
                    <span className="text-xs font-mono text-neutral-400">
                      Renderizando credencial oficial...
                    </span>
                  </div>
                ) : pngError ? (
                  <div className="p-6 text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
                    <p className="text-xs font-mono text-red-300">{pngError}</p>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={credentialDataUrl}
                    alt={`Credencial Club Bacachá ${formattedNumber} - ${fullName}`}
                    className="w-full h-full object-contain select-none"
                  />
                )}
              </div>

              {/* Download & Copy Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={generatingPng || !credentialDataUrl}
                  className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 text-white font-mono text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Descargar PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyImageToClipboard}
                  disabled={generatingPng || !credentialBlob}
                  className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 text-neutral-200 font-mono text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {copiedImage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Imagen Copiada</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Copiar Imagen</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* QR Verification & Revocation Box */}
            <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-850 space-y-2.5 text-[0.68rem] font-mono">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">URL de Verificación QR:</span>
                {qrToken && (
                  <a
                    href={`/member/verify/${qrToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>/m/{qrToken.substring(0, 8)}...</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {!showRevokeConfirm ? (
                <div className="pt-2 border-t border-neutral-850 flex items-center justify-between">
                  <span className="text-neutral-500 text-[0.62rem]">
                    QR persistente vinculado al socio
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRevokeConfirm(true)}
                    className="text-[0.62rem] text-red-400/80 hover:text-red-300 underline cursor-pointer"
                  >
                    Revocar / Regenerar QR
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-red-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-red-400 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>¿Revocar QR actual por seguridad?</span>
                  </div>
                  <p className="text-[0.62rem] text-neutral-400 leading-relaxed">
                    El código QR anterior dejará de ser válido inmediatamente y se emitirá uno nuevo.
                  </p>
                  <input
                    type="text"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Motivo de revocación..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-[0.65rem] text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRevokeConfirm(false)}
                      className="px-2.5 py-1 rounded bg-neutral-850 text-neutral-400 hover:text-white text-[0.62rem]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateQr}
                      disabled={revokingQr}
                      className="px-2.5 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-[0.62rem] font-semibold"
                    >
                      {revokingQr ? "Regenerando..." : "Confirmar Revocación"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Member Info, Message Editor, WhatsApp Dispatch & History */}
          <div className="lg:col-span-7 p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Real Member Info Summary (Read-Only Member Number) */}
              <div className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-850 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[0.6rem] text-neutral-500 uppercase block">
                    TITULAR DE MEMBRESÍA
                  </span>
                  <span className="text-white font-semibold truncate block mt-0.5">
                    {fullName}
                  </span>
                  <span className="text-[0.62rem] text-neutral-400">
                    {member.city} · {member.membership_level}
                  </span>
                </div>

                <div>
                  <span className="text-[0.6rem] text-neutral-500 uppercase flex items-center gap-1">
                    <span>NÚMERO OFICIAL</span>
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                  </span>
                  <span className="text-amber-400 font-bold text-sm block mt-0.5">
                    {formattedNumber}
                  </span>
                  <span className="text-[0.6rem] text-neutral-500">
                    Inmutable (Solo lectura)
                  </span>
                </div>

                <div>
                  <span className="text-[0.6rem] text-neutral-500 uppercase block">
                    WHATSAPP DESTINO
                  </span>
                  {phoneInfo.valid ? (
                    <>
                      <span className="text-emerald-400 font-semibold block mt-0.5">
                        {phoneInfo.display}
                      </span>
                      <span className="text-[0.6rem] text-neutral-500">
                        Formato E.164: {phoneInfo.normalized}
                      </span>
                    </>
                  ) : (
                    <span className="text-red-400 text-[0.68rem] block mt-0.5">
                      {phoneInfo.error}
                    </span>
                  )}
                </div>
              </div>

              {/* Editable Welcome Message */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[0.68rem] font-mono text-neutral-300 uppercase tracking-wider font-semibold">
                    MENSAJE DE BIENVENIDA PERSONALIZADO (EDITABLE)
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setMessage(renderWelcomeMessage(generalTemplate, member))
                    }
                    className="text-[0.65rem] font-mono text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Restaurar desde plantilla general</span>
                  </button>
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-400/70 rounded-xl p-3.5 text-xs text-white font-mono leading-relaxed focus:outline-none"
                />

                <div className="flex items-center justify-between text-[0.63rem] font-mono text-neutral-500">
                  <span>
                    Variables aplicadas: <strong className="text-neutral-300">{fullName}</strong> y{" "}
                    <strong className="text-amber-400">{formattedNumber}</strong>
                  </span>
                  <span>Los cambios aquí no alteran la plantilla general</span>
                </div>
              </div>

              {/* Feedback Banner */}
              {feedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                    feedback.type === "success"
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                      : feedback.type === "warning"
                      ? "bg-amber-950/60 border-amber-500/40 text-amber-200"
                      : "bg-red-950/60 border-red-500/40 text-red-300"
                  }`}
                >
                  {feedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-2 flex-1">
                    <p className="leading-relaxed">{feedback.text}</p>
                    {awaitingManualConfirm && (
                      <button
                        type="button"
                        onClick={handleConfirmManualSent}
                        disabled={actionLoading}
                        className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          Confirmar que ya envié el mensaje y la credencial en WhatsApp
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Primary WhatsApp Action Button */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    disabled={actionLoading || generatingPng || !phoneInfo.valid}
                    className="flex-1 py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs sm:text-sm font-mono uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 fill-black/10" />
                    <span>
                      {actionLoading
                        ? "Preparando Envío..."
                        : hasConfirmedSend
                        ? "Reenviar por WhatsApp"
                        : "Enviar por WhatsApp"}
                    </span>
                  </button>

                  {!awaitingManualConfirm && latestStatus === "preparado" && !hasConfirmedSend && (
                    <button
                      type="button"
                      onClick={handleConfirmManualSent}
                      disabled={actionLoading}
                      className="py-3.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-emerald-500/40 text-emerald-400 font-mono text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Marcar bienvenida como enviada tras confirmar en WhatsApp"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Envío</span>
                    </button>
                  )}
                </div>

                <p className="text-[0.63rem] font-mono text-neutral-500 leading-relaxed">
                  {whatsappApiConfigured
                    ? "Integración oficial WhatsApp Cloud API activa: se enviará y confirmará con el proveedor."
                    : "Al presionar «Enviar por WhatsApp», se descarga la credencial PNG (y se copia al portapapeles) y se abre WhatsApp con el mensaje prellenado para adjuntar la imagen. Solo se marca como «Enviado» cuando confirmes la entrega."}
                </p>
              </div>
            </div>

            {/* Welcome History Log in Supabase */}
            <div className="pt-4 border-t border-neutral-850 space-y-2.5">
              <div className="flex items-center justify-between text-[0.65rem] font-mono text-neutral-400 uppercase tracking-wider">
                <span>HISTORIAL DE BIENVENIDAS EN SUPABASE ({history.length})</span>
                {loadingDetails && <span>Actualizando...</span>}
              </div>

              {history.length === 0 ? (
                <p className="text-[0.68rem] font-mono text-neutral-500 py-2">
                  Aún no hay envíos o descargas de bienvenida registrados para este miembro.
                </p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-850 text-[0.65rem] font-mono flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded uppercase font-semibold text-[0.58rem] ${
                            item.status === "enviado" || item.status === "entregado"
                              ? "bg-emerald-950/80 border border-emerald-500/30 text-emerald-400"
                              : item.status === "error"
                              ? "bg-red-950/80 border border-red-500/30 text-red-400"
                              : "bg-amber-950/80 border border-amber-500/30 text-amber-300"
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-neutral-300 truncate">
                          {item.channel === "WHATSAPP_API"
                            ? "WhatsApp API"
                            : item.channel === "DOWNLOAD_PNG"
                            ? "Descarga PNG"
                            : "WhatsApp"}
                        </span>
                        <span className="text-neutral-500 truncate">
                          · {item.actor_name}
                        </span>
                      </div>
                      <span className="text-neutral-500 shrink-0">
                        {new Date(
                          item.sent_at || item.created_at
                        ).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

