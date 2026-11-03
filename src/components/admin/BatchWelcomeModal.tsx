"use client";

import { useEffect, useState } from "react";
import {
  X,
  QrCode,
  Download,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Users,
  ShieldCheck,
} from "lucide-react";
import {
  DEFAULT_WELCOME_TEMPLATE,
  formatMemberBadge,
  formatMemberFullName,
  normalizeWhatsAppPhone,
  renderWelcomeMessage,
  WelcomeStatus,
} from "@/lib/members/welcome";
import {
  generateMemberCredentialPng,
  triggerCredentialDownload,
} from "@/lib/members/credential-canvas";
import type { WelcomeModalMember } from "./WelcomeCredentialModal";

interface Props {
  members: WelcomeModalMember[];
  initialGeneralTemplate?: string;
  onClose: () => void;
  onUpdated: () => void;
}

interface BatchMemberState {
  member: WelcomeModalMember;
  qrToken: string;
  status: WelcomeStatus;
  confirmed: boolean;
  pngDataUrl?: string;
  pngBlob?: Blob;
  pngFilename?: string;
  generating?: boolean;
  sending?: boolean;
}

export function BatchWelcomeModal({
  members,
  initialGeneralTemplate,
  onClose,
  onUpdated,
}: Props) {
  const [batchTemplate, setBatchTemplate] = useState<string>(
    initialGeneralTemplate || DEFAULT_WELCOME_TEMPLATE
  );
  const [items, setItems] = useState<BatchMemberState[]>(() =>
    members.map((m) => ({
      member: m,
      qrToken: m.qr_token || "",
      status: m.welcome_status || "pendiente",
      confirmed: Boolean(m.welcome_confirmed),
    }))
  );
  const [loadingBatch, setLoadingBatch] = useState<boolean>(true);
  const [preparingAll, setPreparingAll] = useState<boolean>(false);
  const [progressCount, setProgressCount] = useState<number>(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingBatch(true);

    fetch("/api/admin/members/welcome-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberIds: members.map((m) => m.id),
        recordPreparation: false,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.generalTemplate && !initialGeneralTemplate) {
          setBatchTemplate(data.generalTemplate);
        }
        if (Array.isArray(data.items)) {
          const mapById = new Map<string, any>();
          data.items.forEach((it: any) => mapById.set(it.member.id, it));

          setItems((prev) =>
            prev.map((curr) => {
              const serverItem = mapById.get(curr.member.id);
              if (!serverItem) return curr;
              return {
                ...curr,
                member: { ...curr.member, ...serverItem.member },
                qrToken: serverItem.qrToken || curr.qrToken,
              };
            })
          );
        }
      })
      .finally(() => {
        if (active) setLoadingBatch(false);
      });

    return () => {
      active = false;
    };
  }, [members, initialGeneralTemplate]);

  const ensureSinglePng = async (index: number): Promise<{
    dataUrl: string;
    blob: Blob;
    filename: string;
  } | null> => {
    const item = items[index];
    if (!item) return null;
    if (item.pngDataUrl && item.pngBlob && item.pngFilename) {
      return {
        dataUrl: item.pngDataUrl,
        blob: item.pngBlob,
        filename: item.pngFilename,
      };
    }

    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, generating: true } : it))
    );

    try {
      const generated = await generateMemberCredentialPng({
        id: item.member.id,
        member_number: item.member.member_number,
        first_name: item.member.first_name,
        last_name: item.member.last_name,
        qr_token: item.qrToken,
        membership_level: item.member.membership_level,
        city: item.member.city,
        created_at: item.member.created_at,
      });

      setItems((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                generating: false,
                pngDataUrl: generated.dataUrl,
                pngBlob: generated.blob,
                pngFilename: generated.filename,
              }
            : it
        )
      );

      return generated;
    } catch {
      setItems((prev) =>
        prev.map((it, idx) => (idx === index ? { ...it, generating: false } : it))
      );
      return null;
    }
  };

  const handlePrepareAndDownloadAll = async () => {
    setPreparingAll(true);
    setProgressCount(0);
    setFeedback(null);

    try {
      // Registrar preparación del lote en Supabase
      await fetch("/api/admin/members/welcome-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: items.map((i) => i.member.id),
          templateText: batchTemplate,
          recordPreparation: true,
        }),
      });

      for (let i = 0; i < items.length; i++) {
        const res = await ensureSinglePng(i);
        if (res) {
          triggerCredentialDownload(res.dataUrl, res.filename);
          await new Promise((r) => setTimeout(r, 350));
        }
        setProgressCount(i + 1);
      }

      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          status: it.confirmed ? "enviado" : "preparado",
        }))
      );
      onUpdated();
      setFeedback(
        `Se generaron y descargaron ${items.length} credenciales PNG personalizadas (1080 × 1350 px). Ahora puedes enviar cada bienvenida de forma controlada.`
      );
    } finally {
      setPreparingAll(false);
    }
  };

  const handleDownloadOne = async (index: number) => {
    const res = await ensureSinglePng(index);
    if (!res) return;
    triggerCredentialDownload(res.dataUrl, res.filename);
  };

  const handleSendOneWhatsApp = async (index: number) => {
    const item = items[index];
    if (!item) return;

    const phoneInfo = normalizeWhatsAppPhone(item.member.phone);
    if (!phoneInfo.valid) return;

    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, sending: true } : it))
    );

    try {
      const png = await ensureSinglePng(index);
      if (png) {
        triggerCredentialDownload(png.dataUrl, png.filename);
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard &&
          typeof ClipboardItem !== "undefined"
        ) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": png.blob }),
            ]);
          } catch {
            // Ignorar si el navegador restringe portapapeles
          }
        }
      }

      const personalizedMsg = renderWelcomeMessage(batchTemplate, item.member);

      const res = await fetch(`/api/admin/members/${item.member.id}/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare_whatsapp",
          message: personalizedMsg,
        }),
      });

      const data = await res.json();
      const waUrl =
        data.waUrl ||
        `https://wa.me/${phoneInfo.normalized}?text=${encodeURIComponent(
          personalizedMsg
        )}`;

      window.open(waUrl, "_blank", "noopener,noreferrer");

      setItems((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                sending: false,
                status: it.confirmed ? "enviado" : "preparado",
              }
            : it
        )
      );
      onUpdated();
    } finally {
      setItems((prev) =>
        prev.map((it, idx) => (idx === index ? { ...it, sending: false } : it))
      );
    }
  };

  const handleConfirmOneSent = async (index: number) => {
    const item = items[index];
    if (!item) return;

    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, sending: true } : it))
    );

    try {
      const personalizedMsg = renderWelcomeMessage(batchTemplate, item.member);
      const res = await fetch(`/api/admin/members/${item.member.id}/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_manual_sent",
          message: personalizedMsg,
        }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === index
              ? {
                  ...it,
                  sending: false,
                  status: "enviado",
                  confirmed: true,
                }
              : it
          )
        );
        onUpdated();
      }
    } finally {
      setItems((prev) =>
        prev.map((it, idx) => (idx === index ? { ...it, sending: false } : it))
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-850 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-serif tracking-wide text-white uppercase">
                PREPARACIÓN DE BIENVENIDAS EN LOTE ({items.length} MIEMBROS)
              </h2>
              <p className="text-[0.68rem] font-mono text-neutral-400 mt-0.5">
                Cada socio recibe exclusivamente su nombre, su número #0000XX y su código QR único · Envío controlado con autorización administrativa
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Batch Template Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 rounded-xl bg-neutral-900/50 border border-neutral-850">
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[0.68rem] font-mono text-neutral-300 uppercase font-semibold">
                  PLANTILLA PARA ESTE LOTE (VARIABLES &#123;nombre&#125; Y &#123;numero&#125;)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setBatchTemplate(
                      initialGeneralTemplate || DEFAULT_WELCOME_TEMPLATE
                    )
                  }
                  className="text-[0.63rem] font-mono text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restaurar plantilla</span>
                </button>
              </div>
              <textarea
                value={batchTemplate}
                onChange={(e) => setBatchTemplate(e.target.value)}
                rows={5}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 text-[0.68rem] font-mono text-neutral-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Control de Seguridad y Privacidad</span>
                </div>
                <p className="leading-relaxed">
                  No se realizan disparos masivos desatendidos. El sistema genera cada credencial PNG (1080 × 1350 px) con el QR individual de cada socio y te permite enviar y confirmar cada bienvenida.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrepareAndDownloadAll}
                disabled={preparingAll || loadingBatch}
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {preparingAll
                    ? `Generando Credenciales (${progressCount}/${items.length})...`
                    : `Generar y Descargar las ${items.length} Credenciales PNG`}
                </span>
              </button>
            </div>
          </div>

          {feedback && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Queue Table */}
          <div className="rounded-xl border border-neutral-850 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-neutral-900/80 border-b border-neutral-850 text-[0.62rem] text-neutral-400 uppercase tracking-wider">
                  <th className="p-3.5">SOCIO</th>
                  <th className="p-3.5">NOMBRE COMPLETO</th>
                  <th className="p-3.5">TELÉFONO INTERNACIONAL</th>
                  <th className="p-3.5">TOKEN QR EXCLUSIVO</th>
                  <th className="p-3.5">ESTADO</th>
                  <th className="p-3.5 text-right">ACCIONES INDIVIDUALES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850/60">
                {items.map((item, idx) => {
                  const phoneInfo = normalizeWhatsAppPhone(item.member.phone);
                  const badge = formatMemberBadge(item.member.member_number);
                  const fullName = formatMemberFullName(item.member);

                  return (
                    <tr
                      key={item.member.id}
                      className="hover:bg-neutral-900/40 transition-colors"
                    >
                      <td className="p-3.5 font-bold text-amber-400">{badge}</td>
                      <td className="p-3.5 text-white font-sans font-medium">
                        {fullName}
                      </td>
                      <td className="p-3.5">
                        {phoneInfo.valid ? (
                          <span className="text-neutral-300">{phoneInfo.display}</span>
                        ) : (
                          <span className="text-red-400 text-[0.65rem]">
                            {phoneInfo.error}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-neutral-500 text-[0.65rem]">
                        {item.qrToken ? `${item.qrToken.substring(0, 10)}...` : "—"}
                      </td>
                      <td className="p-3.5">
                        {item.confirmed || item.status === "enviado" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[0.6rem] uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Enviado</span>
                          </span>
                        ) : item.status === "preparado" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[0.6rem] uppercase">
                            <Clock className="w-3 h-3" />
                            <span>Preparado</span>
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-[0.62rem] uppercase">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadOne(idx)}
                            disabled={item.generating || !item.qrToken}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-[0.65rem] inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Descargar credencial PNG de este socio"
                          >
                            <Download className="w-3 h-3 text-amber-400" />
                            <span>PNG</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendOneWhatsApp(idx)}
                            disabled={
                              item.sending ||
                              item.generating ||
                              !phoneInfo.valid ||
                              !item.qrToken
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[0.65rem] inline-flex items-center gap-1 transition-colors disabled:opacity-40 cursor-pointer"
                            title="Descargar PNG y abrir WhatsApp con mensaje personalizado"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Enviar WhatsApp</span>
                          </button>

                          {!item.confirmed && item.status === "preparado" && (
                            <button
                              type="button"
                              onClick={() => handleConfirmOneSent(idx)}
                              disabled={item.sending}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[0.65rem] inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="Confirmar que el mensaje fue enviado en WhatsApp"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Confirmar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

