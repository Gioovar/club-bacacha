import { Suspense } from "react";
import { getMemberRepository } from "@/lib/members/repository";
import { formatMemberNumber } from "@/lib/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import Link from "next/link";

type Props = {
  params: Promise<{ token: string }>;
};

export const metadata = {
  title: "Verificación de Membresía | Club Bacachá",
  robots: { index: false, follow: false },
};

async function MemberVerifyCard({ params }: Props) {
  const { token } = await params;
  const repo = getMemberRepository();
  const member = await repo.findByQrToken(token);

  if (!member) {
    return (
      <div className="bg-coal border border-red-500/20 p-8 sm:p-10 rounded-2xl shadow-2xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/70 border border-red-500/30 text-red-400 text-xs font-mono tracking-widest uppercase">
          <span>✕ MEMBRESÍA NO ENCONTRADA</span>
        </div>

        <div>
          <h1 className="display text-3xl text-bone uppercase">
            TOKEN NO VÁLIDO
          </h1>
          <p className="text-sm text-fog font-light mt-3 leading-relaxed">
            El código de verificación no corresponde a ninguna credencial
            activa o ha expirado.
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

  return (
    <div className="bg-coal border border-bone/20 p-8 sm:p-10 rounded-2xl shadow-2xl space-y-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-mono tracking-widest uppercase">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>MEMBRESÍA VÁLIDA</span>
      </div>

      <div>
        <span className="text-[0.62rem] font-mono tracking-[0.3em] uppercase text-ash block mb-1">
          BACACHÁ MEMBER
        </span>
        <h1 className="display text-4xl sm:text-5xl text-bone tracking-tight">
          #{formatMemberNumber(member.memberNumber)}
        </h1>
      </div>

      <div className="py-4 border-y border-bone/10 space-y-2">
        <span className="text-[0.6rem] font-mono tracking-widest uppercase text-ash/80 block">
          TITULAR
        </span>
        <p className="display text-2xl text-bone tracking-wide uppercase">
          {member.firstName}
        </p>
        <p className="text-xs font-mono text-ash">
          Miembro desde {member.since} · Nivel {member.tier}
        </p>
      </div>

      <p className="text-[0.65rem] font-mono uppercase tracking-widest text-ash/60">
        Verificado electrónicamente en Club Bacachá
      </p>
    </div>
  );
}

export default function VerifyMemberPage({ params }: Props) {
  return (
    <div className="min-h-screen bg-ink text-bone flex flex-col justify-between p-6 select-none">
      <div className="fixed inset-0 bg-radial from-graphite/40 to-ink pointer-events-none" />

      <header className="relative z-10 flex justify-between items-center py-4 border-b border-bone/10">
        <BrandLogo size="sm" href="/" />
        <span className="text-[0.6rem] font-mono tracking-widest uppercase text-ash border border-bone/20 px-2 py-0.5 rounded">
          SISTEMA DE VERIFICACIÓN
        </span>
      </header>

      <main className="relative z-10 max-w-md w-full mx-auto my-auto py-10 text-center">
        <Suspense
          fallback={
            <div className="p-8 bg-coal border border-bone/10 rounded-2xl animate-pulse text-xs font-mono text-ash">
              VERIFICANDO CREDENCIAL...
            </div>
          }
        >
          <MemberVerifyCard params={params} />
        </Suspense>
      </main>

      <footer className="relative z-10 text-center py-4 text-xs font-mono text-ash/60 border-t border-bone/10">
        bacacha.com · Acapulco · Acceso Restringido
      </footer>
    </div>
  );
}
