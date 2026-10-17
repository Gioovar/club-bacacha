import { Header } from "@/components/navigation/Header";
import { Footer } from "@/components/navigation/Footer";
import { demoContent } from "@/lib/content/demo";

export const metadata = {
  title: "Aviso de Privacidad",
  description: "Aviso de Privacidad de Club Bacachá.",
};

export default function AvisoPrivacidadPage() {
  return (
    <>
      <Header />
      <div className="grain" aria-hidden="true" />

      <main className="min-h-screen pt-32 pb-24 bg-ink text-bone">
        <div className="container-x max-w-3xl mx-auto space-y-8">
          <div className="border-b border-bone/10 pb-8">
            <span className="eyebrow text-ash block mb-2">MARCO LEGAL</span>
            <h1 className="display text-4xl sm:text-5xl uppercase">
              AVISO DE PRIVACIDAD
            </h1>
            <p className="text-xs font-mono text-ash mt-2">
              Última actualización: Octubre 2026 · [BORRADOR SUJETO A REVISIÓN LEGAL]
            </p>
          </div>

          <div className="space-y-6 text-fog font-light leading-relaxed text-sm sm:text-base">
            <div className="p-4 bg-coal border border-bone/20 text-xs font-mono text-bone/80">
              NOTA: Este texto constituye una estructura base preliminar para Club
              Bacachá (bacacha.com) y debe ser validado por el equipo jurídico
              antes de su entrada en operación comercial.
            </div>

            <h2 className="display text-xl text-bone uppercase pt-4">
              1. Responsable del tratamiento
            </h2>
            <p>
              Club Bacachá, con domicilio en Acapulco, Guerrero, México, es
              responsable de recabar sus datos personales, del uso que se le dé a
              los mismos y de su protección, en estricto apego a la Ley Federal
              de Protección de Datos Personales en Posesión de los Particulares.
            </p>

            <h2 className="display text-xl text-bone uppercase pt-4">
              2. Datos personales recabados
            </h2>
            <p>
              Para los fines del Club recabamos: nombre, apellido, fecha de
              nacimiento (verificación de mayoría de edad legal +18), número de
              teléfono/WhatsApp, correo electrónico, ciudad de residencia y
              cuenta de Instagram opcional.
            </p>

            <h2 className="display text-xl text-bone uppercase pt-4">
              3. Finalidades principales
            </h2>
            <p>
              Identificación y emisión de la membresía digital privada,
              asignación de número de miembro exclusivo, control de accesos a
              eventos y validación de beneficios en establecimientos afiliados.
            </p>

            <h2 className="display text-xl text-bone uppercase pt-4">
              4. Finalidades secundarias y comunicaciones
            </h2>
            <p>
              Únicamente bajo su previo consentimiento voluntario e
              independiente (checkbox no pre-marcado), utilizaremos sus datos
              para enviarle invitaciones privadas, promociones secretas, avisos
              de eventos y novedades vía WhatsApp y correo electrónico. Puede
              revocar su consentimiento en cualquier momento enviando un correo a{" "}
              <a
                href={`mailto:${demoContent.contactEmail}`}
                className="text-bone underline"
              >
                {demoContent.contactEmail}
              </a>
              .
            </p>

            <h2 className="display text-xl text-bone uppercase pt-4">
              5. Derechos ARCO
            </h2>
            <p>
              Usted tiene derecho de acceder, rectificar y cancelar sus datos
              personales, así como de oponerse al tratamiento de los mismos o
              revocar el consentimiento que para tal fin nos haya otorgado.
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
