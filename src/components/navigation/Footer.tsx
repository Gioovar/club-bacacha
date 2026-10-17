import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { SiteContent } from "@/lib/content/types";

type Props = {
  social: SiteContent["social"];
  contactEmail: string;
};

/**
 * Footer Component.
 * Minimalist, dark, luxury brand ending:
 * - Small Logo Bacachá
 * - Instagram, TikTok, WhatsApp
 * - Legal: Aviso de Privacidad, Términos, Contacto
 * - © Club Bacachá
 */
export function Footer({ social, contactEmail }: Props) {
  return (
    <footer className="bg-ink border-t border-bone/10 py-16 sm:py-24 text-fog">
      <div className="container-x">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-bone/10">
          {/* Brand Col */}
          <div className="md:col-span-6 flex flex-col justify-between">
            <div>
              <BrandLogo size="md" href="/" />
              <p className="text-xs tracking-[0.25em] uppercase text-ash mt-3">
                Acapulco · Club Privado
              </p>
            </div>
            <p className="text-sm text-ash/80 max-w-sm mt-8 leading-relaxed">
              Comunidad, experiencias, vida nocturna y beneficios que no
              publicamos.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <span className="text-[0.68rem] tracking-[0.28em] uppercase text-ash font-semibold mb-2">
              NAVEGACIÓN
            </span>
            <a href="#club" className="text-sm hover:text-bone transition-colors">
              El Club
            </a>
            <a
              href="#beneficios"
              className="text-sm hover:text-bone transition-colors"
            >
              Beneficios
            </a>
            <a
              href="#eventos"
              className="text-sm hover:text-bone transition-colors"
            >
              Eventos
            </a>
            <a
              href="#unete"
              className="text-sm hover:text-bone transition-colors"
            >
              Unirme al Club
            </a>
            <Link
              href="/mi-membresia"
              className="text-sm hover:text-bone transition-colors"
            >
              Mi Membresía
            </Link>
          </div>

          {/* Social and Contact */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <span className="text-[0.68rem] tracking-[0.28em] uppercase text-ash font-semibold mb-2">
              CONECTAR
            </span>
            <a
              href={social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:text-bone transition-colors"
            >
              Instagram
            </a>
            <a
              href={social.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:text-bone transition-colors"
            >
              TikTok
            </a>
            <a
              href={`mailto:${contactEmail}`}
              className="text-sm hover:text-bone transition-colors"
            >
              {contactEmail}
            </a>
            <Link
              href="/admin"
              className="text-xs tracking-wider uppercase text-ash/60 hover:text-ash mt-4"
            >
              Portal Admin →
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ash/70">
          <p>© 2026 Club Bacachá. Todos los derechos reservados.</p>

          <div className="flex flex-wrap gap-6 items-center">
            <Link
              href="/aviso-privacidad"
              className="hover:text-bone transition-colors"
            >
              Aviso de Privacidad
            </Link>
            <Link
              href="/terminos"
              className="hover:text-bone transition-colors"
            >
              Términos y Condiciones
            </Link>
            <Link
              href="/contacto"
              className="hover:text-bone transition-colors"
            >
              Contacto
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
