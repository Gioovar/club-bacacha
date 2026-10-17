import { Header } from "@/components/navigation/Header";
import { Footer } from "@/components/navigation/Footer";
import { demoContent } from "@/lib/content/demo";

export const metadata = {
  title: "Contacto",
  description: "Canales de contacto y atención para miembros de Club Bacachá.",
};

export default function ContactoPage() {
  return (
    <>
      <Header />
      <div className="grain" aria-hidden="true" />

      <main className="min-h-screen pt-32 pb-24 bg-ink text-bone">
        <div className="container-x max-w-3xl mx-auto space-y-12">
          <div className="border-b border-bone/10 pb-8">
            <span className="eyebrow text-ash block mb-2">ATENCIÓN AL MIEMBRO</span>
            <h1 className="display text-4xl sm:text-5xl uppercase">CONTACTO</h1>
            <p className="text-sm text-fog mt-2">
              Preguntas sobre tu membresía, alianzas o eventos privados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-coal border border-bone/10">
              <span className="text-xs font-mono text-ash tracking-widest uppercase block mb-2">
                CORREO OFICIAL
              </span>
              <h2 className="display text-2xl uppercase mb-2">ESCRÍBENOS</h2>
              <p className="text-sm text-fog font-light mb-6">
                Para soporte de membresías, dudas o convenios de marca.
              </p>
              <a
                href={`mailto:${demoContent.contactEmail}`}
                className="text-base text-bone font-mono underline hover:text-white"
              >
                {demoContent.contactEmail}
              </a>
            </div>

            <div className="p-8 bg-coal border border-bone/10">
              <span className="text-xs font-mono text-ash tracking-widest uppercase block mb-2">
                COMUNIDAD DIGITAL
              </span>
              <h2 className="display text-2xl uppercase mb-2">SÍGUENOS</h2>
              <p className="text-sm text-fog font-light mb-6">
                Cultura, adelantos y la vida del Club en tiempo real.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={demoContent.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-bone hover:text-white"
                >
                  Instagram: @clubbacacha →
                </a>
                <a
                  href={demoContent.social.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-bone hover:text-white"
                >
                  TikTok: @clubbacacha →
                </a>
              </div>
            </div>
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
