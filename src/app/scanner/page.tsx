"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import {
  AlertTriangle,
  Award,
  Camera,
  CameraOff,
  CheckCircle2,
  Gift,
  History,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  X,
} from "lucide-react";
import type { MemberQrFicha } from "@/lib/members/qr-ficha-server";

interface StaffProfile {
  id: string;
  name: string;
  phone: string;
  username: string;
  role: "MESERO" | "HOSTESS" | "SUPERVISOR" | "GERENTE" | "STAFF";
  status: string;
  visits_registered_count: number;
}

interface RecentOperation {
  id: string;
  memberId: string;
  memberNumber: string;
  formattedNumber: string;
  memberName: string;
  visitNumber: number;
  shiftDate: string;
  visitedAt: string;
  employeeName?: string;
}

interface ShiftCheckState {
  alreadyRegisteredInShift: boolean;
  shiftDate: string;
  firstVisitAt: string | null;
  firstEmployeeName: string | null;
  firstEmployeeRole: string | null;
}

interface VisitSuccessResult {
  memberName: string;
  memberNumberFormatted: string;
  memberNumberRaw: string;
  visitNumber: number;
  employeeName: string;
  visitedAt: string;
  pointsAwarded: number;
}

interface VisitDuplicateResult {
  memberName: string;
  memberNumberFormatted: string;
  memberNumberRaw: string;
  firstVisitAt: string;
  firstEmployeeName: string;
}

function formatDateTimeMX(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatTimeMX(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ScannerPage() {
  const [loadingInit, setLoadingInit] = useState(true);
  const [employeesList, setEmployeesList] = useState<StaffProfile[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState<string>("staff_general");
  const [operatorName, setOperatorName] = useState<string>(
    "Staff Club Bacachá"
  );
  const [operatorRole, setOperatorRole] = useState<string>("HOSTESS");

  const [shiftDate, setShiftDate] = useState("");
  const [shiftVisitsCount, setShiftVisitsCount] = useState(0);
  const [totalVisitsCount, setTotalVisitsCount] = useState(0);
  const [recentOperations, setRecentOperations] = useState<RecentOperation[]>(
    []
  );

  // Estado de Cámara QR en vivo
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedRef = useRef<{ text: string; time: number }>({
    text: "",
    time: 0,
  });

  // Búsqueda manual de respaldo (#000049 o token)
  const [manualInput, setManualInput] = useState("");

  // Estado de Ficha Escaneada y Registro de Visita
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [activeQrToken, setActiveQrToken] = useState("");
  const [ficha, setFicha] = useState<MemberQrFicha | null>(null);
  const [shiftCheck, setShiftCheck] = useState<ShiftCheckState | null>(null);
  const [registeringVisit, setRegisteringVisit] = useState(false);
  const [visitSuccess, setVisitSuccess] = useState<VisitSuccessResult | null>(
    null
  );
  const [visitDuplicate, setVisitDuplicate] =
    useState<VisitDuplicateResult | null>(null);

  const fetchScannerData = useCallback(async () => {
    try {
      const res = await fetch("/api/scanner/auth", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();

      setShiftDate(data.shiftDate || "");
      setShiftVisitsCount(Number(data.shiftVisitsCount || 0));
      setTotalVisitsCount(Number(data.totalVisitsCount || 0));
      setRecentOperations(data.recentOperations || []);

      if (Array.isArray(data.employees)) {
        setEmployeesList(data.employees);
        const savedEmpId =
          typeof window !== "undefined"
            ? localStorage.getItem("bacacha_scanner_emp_id")
            : null;
        if (savedEmpId) {
          const found = data.employees.find(
            (e: StaffProfile) => e.id === savedEmpId
          );
          if (found) {
            setSelectedEmployeeId(found.id);
            setOperatorName(found.name);
            setOperatorRole(found.role);
          }
        }
      }
    } catch {
      // Manejo silencioso
    } finally {
      setLoadingInit(false);
    }
  }, []);

  useEffect(() => {
    fetchScannerData();
  }, [fetchScannerData]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleConsultQr = useCallback(
    async (rawQrText: string) => {
      const cleaned = rawQrText.trim();
      if (!cleaned) return;

      stopCamera();
      setScanLoading(true);
      setScanError("");
      setVisitSuccess(null);
      setVisitDuplicate(null);
      setActiveQrToken(cleaned);

      try {
        const res = await fetch("/api/scanner/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "consult",
            qrToken: cleaned,
            employeeId: selectedEmployeeId,
            employeeName: operatorName,
            employeeRole: operatorRole,
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.ok) {
          setFicha(null);
          setShiftCheck(null);
          setScanError(
            data.error ||
              "No se pudo validar el código QR. Verifica que sea una credencial oficial de Club Bacachá."
          );
          return;
        }

        setFicha(data.ficha);
        setShiftCheck(data.shiftCheck || null);

        if (data.shiftCheck?.alreadyRegisteredInShift && data.ficha) {
          setVisitDuplicate({
            memberName: data.ficha.member.full_name,
            memberNumberFormatted: data.ficha.member.formatted_number,
            memberNumberRaw: data.ficha.member.member_number,
            firstVisitAt:
              data.shiftCheck.firstVisitAt || new Date().toISOString(),
            firstEmployeeName:
              data.shiftCheck.firstEmployeeName || "Personal Club Bacachá",
          });
        }
      } catch {
        setScanError("Error de conexión al consultar la credencial del socio.");
      } finally {
        setScanLoading(false);
      }
    },
    [stopCamera, selectedEmployeeId, operatorName, operatorRole]
  );

  const startCamera = async () => {
    setCameraError("");
    setScanError("");

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        "Tu navegador no permite acceso directo a la cámara. Asegúrate de ingresar mediante https://bacacha.com/scanner en Safari o Chrome."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(async () => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play().catch(() => {});

        let nativeDetector: any = null;
        if (typeof window !== "undefined" && "BarcodeDetector" in window) {
          try {
            const BD = (window as any).BarcodeDetector;
            nativeDetector = new BD({ formats: ["qr_code"] });
          } catch {
            nativeDetector = null;
          }
        }

        const scanFrame = async () => {
          if (!videoRef.current || !streamRef.current) return;
          const v = videoRef.current;

          if (v.readyState >= v.HAVE_ENOUGH_DATA && v.videoWidth > 0) {
            let detectedValue = "";

            if (nativeDetector) {
              try {
                const codes = await nativeDetector.detect(v);
                if (codes && codes.length > 0 && codes[0].rawValue) {
                  detectedValue = String(codes[0].rawValue).trim();
                }
              } catch {}
            }

            if (!detectedValue && canvasRef.current) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext("2d", {
                willReadFrequently: true,
              });
              if (ctx) {
                const targetWidth = Math.min(640, v.videoWidth);
                const scale = targetWidth / v.videoWidth;
                const targetHeight = Math.floor(v.videoHeight * scale);
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                ctx.drawImage(v, 0, 0, targetWidth, targetHeight);
                const imageData = ctx.getImageData(
                  0,
                  0,
                  targetWidth,
                  targetHeight
                );
                const qrResult = jsQR(
                  imageData.data,
                  imageData.width,
                  imageData.height,
                  {
                    inversionAttempts: "attemptBoth",
                  }
                );
                if (qrResult && qrResult.data) {
                  detectedValue = qrResult.data.trim();
                }
              }
            }

            if (detectedValue) {
              const now = Date.now();
              if (
                detectedValue !== lastScannedRef.current.text ||
                now - lastScannedRef.current.time > 2500
              ) {
                lastScannedRef.current = { text: detectedValue, time: now };
                handleConsultQr(detectedValue);
                return;
              }
            }
          }

          rafRef.current = requestAnimationFrame(scanFrame);
        };

        rafRef.current = requestAnimationFrame(scanFrame);
      }, 80);
    } catch (err: any) {
      setCameraActive(false);
      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError"
      ) {
        setCameraError(
          "Permiso de cámara denegado. Autoriza el uso de cámara en tu navegador (Safari/Chrome) y vuelve a presionar ACTIVAR CÁMARA."
        );
      } else {
        setCameraError(
          "No se pudo iniciar la cámara del dispositivo. Verifica que ninguna otra aplicación la esté usando."
        );
      }
    }
  };

  const handleRegisterVisit = async () => {
    if (!activeQrToken && !ficha) return;
    setRegisteringVisit(true);
    setScanError("");

    try {
      const tokenToSend =
        activeQrToken || ficha?.member.formatted_number || "";
      const res = await fetch("/api/scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_visit",
          qrToken: tokenToSend,
          employeeId: selectedEmployeeId,
          employeeName: operatorName,
          employeeRole: operatorRole,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setScanError(data.error || "No fue posible registrar la visita.");
        return;
      }

      if (data.ficha) {
        setFicha(data.ficha);
      }

      if (data.duplicate) {
        setVisitDuplicate({
          memberName:
            data.ficha?.member?.full_name ||
            ficha?.member.full_name ||
            "Socio",
          memberNumberFormatted:
            data.ficha?.member?.formatted_number ||
            ficha?.member.formatted_number ||
            "#000000",
          memberNumberRaw:
            data.ficha?.member?.member_number ||
            ficha?.member.member_number ||
            "000000",
          firstVisitAt: data.firstVisitAt,
          firstEmployeeName: data.firstEmployeeName,
        });
        setShiftCheck({
          alreadyRegisteredInShift: true,
          shiftDate: data.shiftDate,
          firstVisitAt: data.firstVisitAt,
          firstEmployeeName: data.firstEmployeeName,
          firstEmployeeRole: data.firstEmployeeRole,
        });
      } else {
        setVisitSuccess({
          memberName:
            data.ficha?.member?.full_name ||
            ficha?.member.full_name ||
            "Socio",
          memberNumberFormatted:
            data.ficha?.member?.formatted_number ||
            ficha?.member.formatted_number ||
            "#000000",
          memberNumberRaw:
            data.ficha?.member?.member_number ||
            ficha?.member.member_number ||
            "000000",
          visitNumber: data.visitNumber,
          employeeName: data.employeeName || operatorName || "Staff",
          visitedAt: data.visitedAt,
          pointsAwarded: Number(data.pointsAwarded || 0),
        });
        setShiftCheck({
          alreadyRegisteredInShift: true,
          shiftDate: data.shiftDate,
          firstVisitAt: data.visitedAt,
          firstEmployeeName: data.employeeName,
          firstEmployeeRole: data.employeeRole,
        });
        await fetchScannerData();
      }
    } catch {
      setScanError("Error de conexión al registrar la visita.");
    } finally {
      setRegisteringVisit(false);
    }
  };

  const resetCurrentScan = () => {
    setFicha(null);
    setShiftCheck(null);
    setVisitSuccess(null);
    setVisitDuplicate(null);
    setScanError("");
    setActiveQrToken("");
    setManualInput("");
  };

  if (loadingInit) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-[#EAB308] animate-spin mb-3" />
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-white/50">
          Cargando Scanner Club Bacachá...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-16">
      {/* Barra Superior Directa (Sin Contraseña) */}
      <header className="sticky top-0 z-30 bg-[#080808]/95 backdrop-blur-md border-b border-white/10 px-4 py-3.5">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-black border border-[#EAB308]/35 flex items-center justify-center p-1.5 shrink-0">
              <img
                src="/logo.png"
                alt="Club Bacachá"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white truncate">
                  SCANNER CLUB BACACHÁ
                </p>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                  ACTIVO
                </span>
              </div>
              <p className="text-[11px] text-white/45 font-mono truncate">
                Jornada: {shiftDate || "Hoy"} · Operador: {operatorName}
              </p>
            </div>
          </div>

          {employeesList.length > 0 && (
            <select
              value={selectedEmployeeId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedEmployeeId(val);
                if (typeof window !== "undefined") {
                  localStorage.setItem("bacacha_scanner_emp_id", val);
                }
                if (val === "staff_general") {
                  setOperatorName("Staff Club Bacachá");
                  setOperatorRole("HOSTESS");
                } else {
                  const found = employeesList.find((emp) => emp.id === val);
                  if (found) {
                    setOperatorName(found.name);
                    setOperatorRole(found.role);
                  }
                }
              }}
              className="bg-black border border-white/15 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-[#EAB308] outline-none max-w-[160px]"
            >
              <option value="staff_general">Staff General</option>
              {employeesList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-5">
        {/* Contador de visitas registradas durante el turno */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0C0C0C] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/45 block">
                Visitas en la Jornada
              </span>
              <span className="text-2xl font-serif font-bold text-[#EAB308] mt-0.5 block">
                {shiftVisitsCount}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EAB308]/10 border border-[#EAB308]/25 flex items-center justify-center text-[#EAB308]">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#0C0C0C] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/45 block">
                Total Acumulado
              </span>
              <span className="text-2xl font-serif font-bold text-white mt-0.5 block">
                {totalVisitsCount}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
              <QrCode className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Lector QR en vivo y Botón ACTIVAR CÁMARA */}
        <section className="bg-[#0B0B0B] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#EAB308]" />
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-white font-bold">
                Lector de Credenciales QR
              </h2>
            </div>
            {cameraActive && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Cámara en vivo
              </span>
            )}
          </div>

          {!cameraActive ? (
            <div className="py-6 px-4 rounded-2xl bg-black/70 border border-dashed border-white/15 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EAB308]/10 border border-[#EAB308]/30 flex items-center justify-center text-[#EAB308]">
                <QrCode className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-sm font-medium text-white">
                  Escanea la credencial digital del socio
                </p>
                <p className="text-xs text-white/45">
                  Presiona el botón amarillo para abrir la cámara, ver los
                  beneficios del miembro y sumarle su visita.
                </p>
              </div>
              <button
                type="button"
                onClick={startCamera}
                className="w-full sm:w-auto min-w-[230px] py-4 px-7 rounded-2xl bg-[#EAB308] hover:bg-[#CA8A04] text-black font-mono text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2.5 shadow-[0_10px_30px_rgba(234,179,8,0.28)]"
              >
                <Camera className="w-4 h-4" />
                ACTIVAR CÁMARA
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-[#EAB308]/40 aspect-[4/3]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                  <div className="w-52 h-52 border-2 border-[#EAB308]/80 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative">
                    <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-[#EAB308] rounded-tl-xl" />
                    <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-[#EAB308] rounded-tr-xl" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-[#EAB308] rounded-bl-xl" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-[#EAB308] rounded-br-xl" />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={stopCamera}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono uppercase tracking-widest text-white flex items-center justify-center gap-2"
              >
                <CameraOff className="w-4 h-4" />
                Detener Cámara
              </button>
            </div>
          )}

          {cameraError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Búsqueda manual rápida por #Socio o Token */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualInput.trim()) handleConsultQr(manualInput.trim());
            }}
            className="pt-2 border-t border-white/10 flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="O escribe el número de socio (ej. #000049)..."
                className="w-full bg-black border border-white/15 focus:border-[#EAB308] rounded-xl pl-10 pr-3 py-2.5 text-xs text-white outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={scanLoading || !manualInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-mono uppercase tracking-wider text-white font-bold"
            >
              Consultar
            </button>
          </form>
        </section>

        {/* Estado cargando lectura QR */}
        {scanLoading && (
          <div className="bg-[#0B0B0B] border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center gap-3">
            <Loader2 className="w-8 h-8 text-[#EAB308] animate-spin" />
            <p className="text-xs font-mono uppercase tracking-widest text-white/60">
              Validando credencial en Supabase...
            </p>
          </div>
        )}

        {/* Error de QR inválido o revocado */}
        {scanError && (
          <div className="bg-red-950/30 border border-red-500/40 rounded-3xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-mono uppercase tracking-widest text-red-400 font-bold">
                  Credencial No Válida
                </h3>
                <p className="text-sm text-white/85 leading-relaxed">
                  {scanError}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                resetCurrentScan();
                startCamera();
              }}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono uppercase tracking-widest text-white font-bold"
            >
              Escanear otro QR
            </button>
          </div>
        )}

        {/* 5. PANTALLA DE ÉXITO: ✅ VISITA REGISTRADA */}
        {visitSuccess && (
          <section className="bg-emerald-950/30 border-2 border-emerald-500/50 rounded-3xl p-6 space-y-4 shadow-[0_0_50px_rgba(16,185,129,0.18)]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-4 h-4" />✅ VISITA REGISTRADA
              </span>
              <button
                onClick={resetCurrentScan}
                className="text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <h3 className="text-2xl font-serif text-white">
                ¡Bienvenido, {visitSuccess.memberName}!
              </h3>
              <p className="text-sm font-mono font-bold text-[#EAB308] tracking-widest">
                SOCIO {visitSuccess.memberNumberFormatted}
              </p>
            </div>

            <div className="bg-black/60 border border-white/10 rounded-2xl p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Visita número:</span>
                <span className="text-white font-bold text-sm">
                  {visitSuccess.visitNumber}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/50">Registrado por:</span>
                <span className="text-white font-bold">
                  {visitSuccess.employeeName}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/50">Fecha y hora:</span>
                <span className="text-white">
                  {formatDateTimeMX(visitSuccess.visitedAt)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                resetCurrentScan();
                startCamera();
              }}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Escanear Siguiente Socio
            </button>
          </section>
        )}

        {/* 6. PREVENCIÓN DE DUPLICADOS: ⚠️ VISITA YA REGISTRADA */}
        {visitDuplicate && !visitSuccess && (
          <section className="bg-amber-950/30 border-2 border-amber-500/50 rounded-3xl p-6 space-y-3 shadow-[0_0_40px_rgba(245,158,11,0.14)]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold uppercase tracking-widest">
                <AlertTriangle className="w-4 h-4" />
                ⚠️ VISITA YA REGISTRADA
              </span>
              <button
                onClick={resetCurrentScan}
                className="text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-serif text-white">
                {visitDuplicate.memberName}
              </h3>
              <p className="text-sm font-mono font-bold text-[#EAB308]">
                Socio {visitDuplicate.memberNumberFormatted}
              </p>
            </div>

            <p className="text-xs text-white/80">
              Este miembro ya registró su visita.
            </p>

            <div className="bg-black/60 border border-white/10 rounded-xl p-3.5 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-white/50">Primer registro:</span>
                <span className="text-amber-300 font-bold">
                  {formatTimeMX(visitDuplicate.firstVisitAt)} (
                  {formatDateTimeMX(visitDuplicate.firstVisitAt)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Registrado por:</span>
                <span className="text-white/80">
                  {visitDuplicate.firstEmployeeName}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* 12. CONSULTA DE BENEFICIOS Y FICHA DIGITAL AL ESCANEAR QR */}
        {ficha && (
          <section className="bg-[#0B0B0B] border border-[#EAB308]/35 rounded-3xl p-6 space-y-6 shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-[#EAB308] tracking-widest">
                    SOCIO {ficha.member.formatted_number}
                  </span>
                  {ficha.member.is_birthday_month && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider bg-pink-500/15 text-pink-300 border border-pink-500/30">
                      🎂 Mes de Cumpleaños
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-serif text-white">
                  {ficha.member.full_name}
                </h3>
                <p className="text-xs text-white/45 mt-0.5">
                  Nivel: {ficha.member.membership_level} · Miembro desde{" "}
                  {ficha.member.since_year}
                </p>
              </div>

              <span
                className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest border ${
                  ficha.member.is_active
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
                    : "bg-red-500/15 text-red-400 border-red-500/35"
                }`}
              >
                {ficha.member.status_label}
              </span>
            </div>

            <div
              className={`grid ${
                ficha.stats.handles_points ? "grid-cols-3" : "grid-cols-2"
              } gap-3`}
            >
              <div className="bg-black/70 border border-white/10 rounded-2xl p-3.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/45 block">
                  Total Visitas
                </span>
                <span className="text-2xl font-serif font-bold text-white mt-1 block">
                  {ficha.stats.total_visits}
                </span>
              </div>

              <div className="bg-black/70 border border-white/10 rounded-2xl p-3.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/45 block">
                  Nivel Fidelización
                </span>
                <span className="text-xs font-mono font-bold text-[#EAB308] mt-1.5 block leading-snug">
                  {ficha.stats.loyalty_level}
                </span>
              </div>

              {ficha.stats.handles_points && (
                <div className="bg-black/70 border border-white/10 rounded-2xl p-3.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/45 block">
                    Puntos Acumulados
                  </span>
                  <span className="text-2xl font-serif font-bold text-[#EAB308] mt-1 block">
                    {ficha.stats.points_balance ?? 0}
                  </span>
                </div>
              )}
            </div>

            {/* Botón REGISTRAR VISITA */}
            {!visitSuccess && (
              <div>
                {!ficha.member.is_active ? (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-center font-mono">
                    MEMBRESÍA INACTIVA — No es posible registrar visitas para
                    este socio.
                  </div>
                ) : shiftCheck?.alreadyRegisteredInShift ? (
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-center text-xs text-white/60 font-mono">
                    Modo consulta de membresía activo (visita ya contabilizada
                    en la jornada actual).
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={registeringVisit}
                    onClick={handleRegisterVisit}
                    className="w-full py-4 px-6 rounded-2xl bg-[#EAB308] hover:bg-[#CA8A04] disabled:opacity-50 text-black font-mono text-sm font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2.5 shadow-[0_12px_35px_rgba(234,179,8,0.3)]"
                  >
                    {registeringVisit ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Registrando visita...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        REGISTRAR VISITA
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Beneficios disponibles para este socio */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#EAB308]" />
                  <h4 className="text-xs font-mono uppercase tracking-widest text-white font-bold">
                    Beneficios Disponibles ({ficha.available_benefits.length})
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-white/40">
                  Solo consulta
                </span>
              </div>

              {ficha.available_benefits.length === 0 ? (
                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 text-center text-xs text-white/50 font-mono">
                  Sin beneficios disponibles
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ficha.available_benefits.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl bg-black/70 border border-[#EAB308]/25 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-white">
                          {b.title}
                        </p>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider bg-[#EAB308]/15 text-[#EAB308] shrink-0">
                          {b.benefit_type}
                        </span>
                      </div>
                      {b.phrase && (
                        <p className="text-xs text-[#EAB308]/90">{b.phrase}</p>
                      )}
                      {b.terms && (
                        <p className="text-[11px] text-white/60 leading-relaxed whitespace-pre-line border-t border-white/10 pt-2 mt-1">
                          {b.terms}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Cláusulas Oficiales de Promociones del Club */}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-[#EAB308]/20 text-[11px] font-mono text-white/65 space-y-1">
                <p className="text-[#EAB308] font-bold">
                  Club Bacachá | Cantina Dolores
                </p>
                <p>• Promociones exclusivas para miembros del Club Bacachá.</p>
                <p>• Límite de una promoción por miembro.</p>
                <p>• Válidas hasta las 11:59 pm</p>
                <p className="text-white/50 pt-1">
                  Únete al Club Bacachá en &ldquo;www.bacacha.com&rdquo; (https://www.bacacha.com).
                </p>
              </div>
            </div>

            {ficha.used_benefits.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-white/50" />
                  <h4 className="text-xs font-mono uppercase tracking-widest text-white/70 font-bold">
                    Beneficios Ya Utilizados ({ficha.used_benefits.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {ficha.used_benefits.map((ub) => (
                    <div
                      key={ub.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="text-white/80 font-medium">{ub.title}</p>
                        <p className="text-[10px] text-white/40 font-mono">
                          {formatDateTimeMX(ub.used_at)}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-white/60">
                        Utilizado
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Historial de las últimas operaciones */}
        <section className="bg-[#0B0B0B] border border-white/10 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#EAB308]" />
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-white font-bold">
                Últimas Visitas Registradas
              </h3>
            </div>
            <button
              type="button"
              onClick={fetchScannerData}
              className="text-white/40 hover:text-white p-1"
              title="Actualizar historial"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentOperations.length === 0 ? (
            <p className="text-xs text-white/40 text-center py-6 font-mono">
              Aún no se han registrado visitas en esta jornada.
            </p>
          ) : (
            <div className="divide-y divide-white/5">
              {recentOperations.slice(0, 12).map((op) => (
                <div
                  key={op.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#EAB308]">
                        {op.formattedNumber}
                      </span>
                      <span className="text-white font-medium truncate">
                        {op.memberName}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40 font-mono mt-0.5">
                      {formatDateTimeMX(op.visitedAt)}
                      {op.employeeName ? ` · Por: ${op.employeeName}` : ""}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-mono text-[10px] shrink-0">
                    Visita #{op.visitNumber}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
