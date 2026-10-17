"use client";

import type { SiteContent } from "@/lib/content/types";
import { MemberCard } from "@/components/member/MemberCard";
import { RevealLines } from "@/components/motion/RevealLines";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  content: SiteContent["membership"];
};

/**
 * Membership Showcase Section.
 * Spotlights the digital member card with high desire/FOMO trigger.
 */
export function MembershipSection({ content }: Props) {
  return (
    <section className="py-24 sm:py-36 bg-coal overflow-hidden border-t border-bone/5">
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Card Presentation Column */}
          <div className="lg:col-span-6 flex justify-center order-2 lg:order-1">
            <div className="w-full max-w-md py-6">
              <MemberCard
                firstName={content.demo.firstName}
                memberNumber={content.demo.memberNumber}
                since={content.demo.since}
              />
              <p className="text-[0.65rem] tracking-[0.3em] uppercase text-ash text-center mt-6">
                Interactúa con la tarjeta · Tu credencial digital privada
              </p>
            </div>
          </div>

          {/* Text and Value Prop Column */}
          <div className="lg:col-span-6 flex flex-col justify-center order-1 lg:order-2">
            <Reveal>
              <p className="eyebrow mb-4 text-ash">{content.eyebrow}</p>
            </Reveal>

            <RevealLines
              lines={content.titleLines}
              as="h2"
              className="display t-lg text-bone tracking-tight mb-6"
            />

            <Reveal delay={0.2} className="space-y-6 max-w-xl">
              <p className="text-base sm:text-lg text-fog font-light leading-relaxed">
                {content.body}
              </p>

              <ul className="space-y-3 pt-2">
                {[
                  "Número de miembro oficial único e intransferible",
                  "Acceso directo y validación de beneficios vía código QR",
                  "Sin contraseñas complicadas: entra con tu enlace privado",
                  "Guardable directamente en tu teléfono móvil",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ash">
                    <span className="text-bone mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.4} className="mt-10">
              <a
                href="#unete"
                className="btn btn-primary !min-h-[3.5rem] !px-8 text-xs tracking-[0.25em]"
              >
                OBTÉN TU MEMBRESÍA
              </a>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
