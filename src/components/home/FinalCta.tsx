"use client";

import type { SiteContent } from "@/lib/content/types";
import { RevealLines } from "@/components/motion/RevealLines";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  content: SiteContent["finalCta"];
};

/**
 * Final CTA Section.
 * Completely pitch-black background.
 * Headline: ¿TÚ YA ERES DEL CLUB?
 * Text: No te vamos a contar todo aquí.
 * CTA: ÚNETE A BACACHÁ
 */
export function FinalCta({ content }: Props) {
  return (
    <section className="relative py-32 sm:py-48 bg-ink border-t border-bone/5 text-center overflow-hidden">
      {/* Background glow subtle */}
      <div className="absolute inset-0 bg-radial from-graphite/30 to-ink pointer-events-none" />

      <div className="container-x relative z-10 max-w-4xl mx-auto">
        <RevealLines
          lines={content.titleLines}
          as="h2"
          className="display t-giant text-bone tracking-tight mb-8"
          lineClassName="leading-[0.85]"
        />

        <Reveal delay={0.2} className="mb-12">
          <p className="text-xl sm:text-2xl text-fog font-light tracking-wide">
            {content.body}
          </p>
        </Reveal>

        <Reveal delay={0.4}>
          <a
            href={content.cta.href}
            className="btn btn-primary !min-h-[4rem] !px-12 text-sm tracking-[0.28em]"
          >
            {content.cta.label}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
