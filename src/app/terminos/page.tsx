import { Header } from "@/components/navigation/Header";
import { Footer } from "@/components/navigation/Footer";
import { demoContent } from "@/lib/content/demo";

export const metadata = {
  title: "Términos y Condiciones",
  description: "Términos y Condiciones de Club Bacachá.",
};

export default function TerminosPage() {
  return (
    <>
      <Header />
      <div className="grain" aria-hidden="true" />

      <main className="min-h-screen pt-32 pb-24 bg-ink text-bone">
        <div className="container-x max-w-3xl mx-auto space-y-8">
          <div className="border-b border-bone/10 pb-8">
            <span className="eyebrow text-ash block mb-2">MARCO LEGAL</span>
            <h1 className="display text-4xl sm:text-5xl uppercase">
              TÉRMINOS Y CONDICIONES
            </h1>
            <p className="text-xs font-mono text-ash mt-2">
              Última actualización: Octubre 2026 · [BORRADOR SUJETO A REVISIÓN LEGAL]
            </p>
          </div>

          <div className="space-y-6 text-fog font-light leading-relaxed text-sm sm:text-base">
            <div className="p-4 bg-coal border border-bone/20 text-xs font-mono text-bone/80">
              NOTA: Este documento rige el acceso y uso de la plataforma digital y
              membresía de Club Bacachá (bacacha.com). Documento base sujeto a
              revisión jurídica formal.
            </div>

            <h2 className="display text-xl text-bone uppercase pt-4">
              1. Naturaleza del Club
            </h2>
            <p>
              Club Bacachá es una comunidad privada y plataforma digital que
              conecta a sus miembros con experiencias exclusivas, vida nocturna,
              promociones y eventos en Acapulco y otras ciudades.
            </p>

            <h2 className="display text-xl text-bone uppercase pt-4">
              2. Requisito de Mayoría de Edad (+18)
            </h2>
            <p>
              Para registrarse y obtener una membresía digital, es requisito
              estricto e indispensable contar con al menos 18 años cumplidos al
              momento del registro. Club Bacachá se reserva el derecho de exigir
              identificación oficial vigente en puerta para cualquier evento o
              beneficio.
            </p>

            <h2 className="display text-xl text-bone uppercase pt-4">
              3. Membresía y Código QR
            </h2>
            <p>
              La membresía digital y el número de miembro asignado son
              personales e intransferibles. El uso indebido o transferencia no
              autorizada de credenciales podrá resultar en la suspensión
              inmediata del estatus de miembro.
            </p>

            <h2 className="display text-xl text-bone uppercase pt-4">
              4. Derecho de Admisión y Reservaciones
            </h2>
            <p>
              La posesión de una membresía digital otorga beneficios y accesos
              preferenciales, pero la admisión final a establecimientos y eventos
              privados está sujeta a los lineamientos de aforo, código de
              vestimenta y políticas particulares del venue.
            </p>
          </div>
        </div>
      </main>

      <Footer
        social={demoContent.social}
        contactEmail={demoContent.contactEmail}
      />
    </>
  );
}
