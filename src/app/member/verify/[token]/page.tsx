import { Suspense } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getMemberQrFichaByToken } from "@/lib/members/qr-ficha-server";
import { getScannerSession } from "@/lib/scanner/staff-server";
import { getAdminSession } from "@/lib/admin/session";
import { MemberQrFichaClient } from "@/components/members/MemberQrFichaClient";

type Props = {
  params: Promise<{ token: string }>;
};

export const metadata = {
  title: "Verificación de Membresía | Club Bacachá",
  robots: { index: false, follow: false },
};

async function MemberVerifyCard({ params }: Props) {
  const { token } = await params;

  const [ficha, scannerSession, adminSession] = await Promise.all([
    getMemberQrFichaByToken(token, { recordScan: true }),
    getScannerSession(),
    getAdminSession(),
  ]);

  if (!ficha) {
    return (
      <div className="bg-coal border border-red-500/20 p-8 sm:p-10 rounded-2xl shadow-2xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/70 border border-red-500/30 text-red-400 text-xs font-mono tracking-widest uppercase">
          <span>✕ MEMBRESÍA NO ENCONTRADA</span>
        </div>

        <div>
          <h1 className="display text-3xl text-bone uppercase">
            TOKEN NO VÁLIDO O REVOCADO
          </h1>
          <p className="text-sm text-fog font-light mt-3 leading-relaxed">
            El código de verificación no corresponde a ninguna credencial
            activa o fue revocado por seguridad.
          </p>
        </div>

        <Link
          href="/"
          className="btn btn-primary w-full !min-h-[3rem] text-xs tracking-widest"
        >
          IR A BACACHA.COM
        </Link>
      </div>
    );
  }

  const authorizedActor = scannerSession
    ? {
        id: scannerSession.employee.id,
        name: scannerSession.employee.name,
        role: scannerSession.employee.role,
      }
    : adminSession
    ? {
        id: `admin_${adminSession.user.id}`,
        name: adminSession.user.name,
        role: "GERENTE",
      }
    : {
        id: "staff_general",
        name: "Staff Club Bacachá",
        role: "STAFF",
      };

  return (
    <MemberQrFichaClient
      token={token}
      initialFicha={ficha}
      authorizedActor={authorizedActor}
    />
  );
}

export default function VerifyMemberPage({ params }: Props) {
  return (
    <div className="min-h-screen bg-ink text-bone flex flex-col justify-between p-4 sm:p-6 select-none">
      <div className="fixed inset-0 bg-radial from-graphite/40 to-ink pointer-events-none" />

      <header className="relative z-10 flex justify-between items-center py-4 border-b border-bone/10 max-w-lg w-full mx-auto">
        <BrandLogo size="sm" href="/" />
        <span className="text-[0.6rem] font-mono tracking-widest uppercase text-ash border border-bone/20 px-2 py-0.5 rounded">
          FICHA DIGITAL DE SOCIO
        </span>
      </header>

      <main className="relative z-10 max-w-lg w-full mx-auto my-auto py-8 text-center">
        <Suspense
          fallback={
            <div className="p-8 bg-coal border border-bone/10 rounded-2xl animate-pulse text-xs font-mono text-ash">
              VERIFICANDO CREDENCIAL EN SUPABASE...
            </div>
          }
        >
          <MemberVerifyCard params={params} />
        </Suspense>
      </main>

      <footer className="relative z-10 text-center py-4 text-xs font-mono text-ash/60 border-t border-bone/10 max-w-lg w-full mx-auto">
        bacacha.com · Acapulco · Acceso Restringido
      </footer>
    </div>
  );
}
