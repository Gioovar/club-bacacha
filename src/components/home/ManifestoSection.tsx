"use client";

import type { ManifestoContent } from "@/lib/content/types";
import { RevealLines } from "@/components/motion/RevealLines";
import { Reveal } from "@/components/motion/Reveal";
import { ImageReveal } from "@/components/motion/ImageReveal";

type Props = {
  content: ManifestoContent;
};

/**
 * Manifesto Section.
 * Negative space, high contrast, pure editorial luxury rhythm.
 * Headline: NO ES UNA LISTA. ES EL CLUB.
 * Body: Club Bacachá reúne personas, experiencias, promociones, eventos y beneficios que no siempre aparecen en redes sociales.
 * Closing: Aquí empieza todo.
 */
export function ManifestoSection({ content }: Props) {
  return (
    <section id="club" className="relative py-28 sm:py-40 bg-ink overflow-hidden border-t border-bone/5">
      <div className="container-x">
        {/* Editorial Layout: Asymmetric 2-column on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Text Column */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <Reveal>
              <p className="eyebrow mb-6 text-ash">{content.kicker}</p>
            </Reveal>

            {/* Giant Manifesto Headline */}
            <RevealLines
              lines={content.lines}
              as="h2"
              className="display t-xl text-bone tracking-tight mb-8 sm:mb-12"
              lineClassName="leading-[0.88]"
            />

            <Reveal delay={0.2} className="max-w-xl space-y-6">
              <p className="text-lg sm:text-2xl text-fog font-light leading-relaxed">
                {content.body}
              </p>
              <p className="display text-xl sm:text-2xl text-bone tracking-widest uppercase">
                {content.closing}
              </p>
            </Reveal>

            <Reveal delay={0.4} className="mt-10 sm:mt-12">
              <a
                href="#unete"
                className="inline-flex items-center gap-3 text-xs tracking-[0.28em] uppercase text-bone link-line group"
              >
                <span>Conoce la membresía</span>
                <span className="transform transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </a>
            </Reveal>
          </div>

          {/* Photo Column: Unmarked Door / Mysterious Entry */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0">
            <div className="relative max-w-md mx-auto aspect-[3/4] w-full">
              <ImageReveal
                image={content.image}
                sizes="(max-width: 1024px) 100vw, 40vw"
                speed={0.12}
                cursorLabel="ENTRAR"
                className="w-full h-full shadow-2xl"
              />
              {/* Discrete Caption */}
              <div className="absolute -bottom-6 right-0 text-[0.6rem] tracking-[0.3em] uppercase text-ash/60">
                Acapulco Secreto
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
