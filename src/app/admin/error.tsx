"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, LogOut, Home } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin runtime error:", error);
  }, [error]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/admin";
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="p-4 rounded-full bg-red-950/40 border border-red-500/30 text-red-400 mb-6">
        <AlertTriangle className="w-10 h-10" />
      </div>

      <h1 className="text-xl sm:text-2xl font-serif text-white tracking-wide uppercase mb-2">
        Hubo un detalle al cargar esta sección
      </h1>
      <p className="text-xs sm:text-sm font-sans text-neutral-400 max-w-md mb-8">
        El sistema de administración se recuperó de manera segura. Puedes recargar los datos o volver a ingresar tus credenciales.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-400/10"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reintentar</span>
        </button>

        <button
          onClick={handleLogout}
          className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white font-medium text-xs tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" />
          <span>Cerrar Sesión</span>
        </button>

        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white font-medium text-xs tracking-wider uppercase transition-all flex items-center gap-2"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Ir a la Web</span>
        </Link>
      </div>

      {error?.digest && (
        <span className="text-[0.62rem] font-mono text-neutral-600 mt-8">
          Código de referencia: {error.digest}
        </span>
      )}
    </div>
  );
}
