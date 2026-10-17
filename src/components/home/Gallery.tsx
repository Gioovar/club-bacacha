"use client";

import type { SiteContent } from "@/lib/content/types";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { RevealLines } from "@/components/motion/RevealLines";
import { Reveal } from "@/components/motion/Reveal";
import { Marquee } from "@/components/motion/Marquee";

type Props = {
  content: SiteContent["gallery"];
};

/**
 * Gallery / Club Culture Section.
 * "ASÍ SE VIVE EL CLUB"
 * Asymmetric editorial collage layout with parallax variations,
 * interleaved typography words, and infinite horizontal marquee.
 */
export function Gallery({ content }: Props) {
  return (
    <section className="py-24 sm:py-36 bg-ink overflow-hidden border-t border-bone/5">
      {/* Section Header */}
      <div className="container-x mb-16 sm:mb-24">
        <Reveal>
          <p className="eyebrow mb-4 text-ash">{content.eyebrow}</p>
        </Reveal>
        <RevealLines
          lines={content.titleLines}
          as="h2"
          className="display t-lg text-bone tracking-tight"
        />
      </div>

      {/* Infinite Horizontal Marquee */}
      <div className="py-6 border-y border-bone/10 mb-16 sm:mb-24 bg-coal/50">
        <Marquee
          items={content.marquee}
          className="display text-4xl sm:text-6xl lg:text-7xl text-bone/25"
          speed={40}
        />
      </div>

      {/* Asymmetric Editorial Grid */}
      <div className="container-x">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Row 1: Portrait left (4 cols) + Landscape right (8 cols) */}
          <div className="md:col-span-5 aspect-[3/4] relative">
            <ImageReveal
              image={content.items[0].image}
              sizes="(max-width: 768px) 100vw, 40vw"
              speed={content.items[0].speed}
              cursorLabel="CLUB"
              className="w-full h-full"
            />
          </div>

          <div className="md:col-span-7 flex flex-col justify-between h-full gap-8">
            <div className="aspect-[16/10] relative w-full">
              <ImageReveal
                image={content.items[1].image}
                sizes="(max-width: 768px) 100vw, 60vw"
                speed={content.items[1].speed}
                cursorLabel="ACAPULCO"
                className="w-full h-full"
              />
            </div>
            {/* Editorial Interleaved Word */}
            <div className="flex justify-between items-baseline pt-4 border-b border-bone/10 pb-4">
              <span className="display text-4xl sm:text-6xl text-bone">
                ACAPULCO
              </span>
              <span className="text-xs tracking-[0.3em] uppercase text-ash">
                BAHÍA NOCTURNA
              </span>
            </div>
          </div>

          {/* Interleaved Word Banner */}
          <div className="md:col-span-12 py-8 flex items-center justify-between text-bone/40">
            <span className="display text-3xl sm:text-5xl text-outline hover:text-bone transition-colors">
              NOCHE
            </span>
            <span className="text-xs tracking-[0.3em] uppercase text-ash">
              •
            </span>
            <span className="display text-3xl sm:text-5xl text-outline hover:text-bone transition-colors">
              AMIGOS
            </span>
            <span className="text-xs tracking-[0.3em] uppercase text-ash">
              •
            </span>
            <span className="display text-3xl sm:text-5xl text-outline hover:text-bone transition-colors">
              BACACHÁ
            </span>
          </div>

          {/* Row 2: Three columns asymmetric */}
          <div className="md:col-span-4 aspect-[3/4] relative">
            <ImageReveal
              image={content.items[2].image}
              sizes="(max-width: 768px) 100vw, 33vw"
              speed={content.items[2].speed}
              cursorLabel="ESTILO"
              className="w-full h-full"
            />
          </div>

          <div className="md:col-span-4 aspect-[3/4] relative md:translate-y-8">
            <ImageReveal
              image={content.items[3].image}
              sizes="(max-width: 768px) 100vw, 33vw"
              speed={content.items[3].speed}
              cursorLabel="ENERGÍA"
              className="w-full h-full"
            />
          </div>

          <div className="md:col-span-4 aspect-[3/4] relative">
            <ImageReveal
              image={content.items[5].image}
              sizes="(max-width: 768px) 100vw, 33vw"
              speed={content.items[5].speed}
              cursorLabel="BEATS"
              className="w-full h-full"
            />
          </div>

          {/* Row 3: Full width or large landscape showcase */}
          <div className="md:col-span-12 pt-8">
            <div className="aspect-[16/9] sm:aspect-[21/9] relative w-full overflow-hidden">
              <ImageReveal
                image={content.items[6].image}
                sizes="100vw"
                speed={content.items[6].speed}
                cursorLabel="PRIVADO"
                className="w-full h-full"
              />
            </div>
            <div className="flex justify-between items-center pt-4">
              <span className="display text-2xl sm:text-3xl text-bone">
                EL CLUB
              </span>
              <span className="text-[0.65rem] tracking-[0.3em] uppercase text-ash">
                Momentos irrepetibles
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
