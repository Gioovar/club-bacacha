"use client";

import { useRef } from "react";
import Image from "next/image";
import type { Benefit } from "@/lib/content/types";
import { RevealLines } from "@/components/motion/RevealLines";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  eyebrow: string;
  titleLines: string[];
  items: Benefit[];
};

/**
 * Benefits Slider Section.
 * Visual, editorial large horizontal slider.
 * NO SaaS cards. Pure photography + bold title + concise phrase.
 */
export function BenefitsSlider({ eyebrow, titleLines, items }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const distance = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  return (
    <section id="beneficios" className="py-24 sm:py-36 bg-coal overflow-hidden border-t border-bone/5">
      <div className="container-x mb-12 sm:mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <Reveal>
            <p className="eyebrow mb-4 text-ash">{eyebrow}</p>
          </Reveal>
          <RevealLines
            lines={titleLines}
            as="h2"
            className="display t-lg text-bone tracking-tight"
          />
        </div>

        {/* Slider Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Deslizar beneficios a la izquierda"
            className="w-12 h-12 flex items-center justify-center border border-bone/20 text-bone hover:border-bone hover:bg-bone/10 transition-colors"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Deslizar beneficios a la derecha"
            className="w-12 h-12 flex items-center justify-center border border-bone/20 text-bone hover:border-bone hover:bg-bone/10 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Benefits Content */}
      {items.length === 0 ? (
        <div className="container-x py-12">
          <div className="border border-bone/10 bg-graphite/40 p-8 sm:p-12 text-center max-w-xl mx-auto">
            <p className="font-mono text-xs tracking-widest uppercase text-accent mb-3">
              Membresía & Experiencias
            </p>
            <h3 className="display text-xl sm:text-2xl text-bone mb-3">
              Próximamente para miembros
            </h3>
            <p className="text-sm text-fog font-light leading-relaxed mb-6">
              Estamos configurando promociones de barra, recompensas de fidelidad y accesos exclusivos. Únete al club para ser el primero en recibirlos.
            </p>
            <a
              href="/#unete"
              className="inline-flex items-center justify-center px-6 py-3 border border-accent text-accent text-xs font-mono uppercase tracking-widest hover:bg-accent hover:text-ink transition-colors"
            >
              Unirme a Club Bacachá
            </a>
          </div>
        </div>
      ) : (
        /* Horizontal Scroll Track */
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth px-5 sm:px-10 lg:px-14 pb-8"
        >
          {items.map((benefit, index) => (
            <div
              key={benefit.id}
              className="flex-none w-[80vw] sm:w-[380px] lg:w-[420px] group select-none"
            >
              {/* Visual Media Container */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-graphite mb-6">
                <Image
                  src={benefit.image.src}
                  alt={benefit.image.alt}
                  fill
                  unoptimized={Boolean(benefit.image.src?.startsWith("http"))}
                  sizes="(max-width: 640px) 80vw, 420px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ objectPosition: benefit.image.focal || "50% 50%" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />

                {/* Number Index */}
                <div className="absolute top-4 left-4 text-xs font-mono tracking-widest text-bone/60">
                  0{index + 1}
                </div>

                {/* In-Card Title and Phrase */}
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end">
                  <h3 className="display text-2xl sm:text-3xl text-bone mb-2 tracking-tight uppercase">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-fog font-light leading-relaxed">
                    {benefit.phrase}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
