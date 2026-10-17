"use client";

import Image from "next/image";
import type { HeroContent } from "@/lib/content/types";
import { RevealLines } from "@/components/motion/RevealLines";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  content: HeroContent;
};

/**
 * Fullscreen Hero Section (~100vh).
 * Responsive background photography (desktop wide / mobile vertical).
 * Headline: ¿TÚ YA ERES DEL CLUB?
 * Secondary: BACACHÁ / Hay cosas que no publicamos. Se las contamos al Club.
 * CTAs: QUIERO SER PARTE / DESCUBRE EL CLUB
 * Minimal scroll cue indicator.
 */
export function Hero({ content }: Props) {
  return (
    <section className="relative w-full h-screen-safe flex flex-col justify-between overflow-hidden bg-ink select-none">
      {/* Background Media with Dark Cinematic Overlays */}
      <div className="absolute inset-0 z-0">
        {/* Mobile Background */}
        <div className="block md:hidden absolute inset-0">
          <Image
            src={content.image.mobile.src}
            alt={content.image.mobile.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover animate-kenburns"
            style={{ objectPosition: content.image.mobile.focal || "50% 50%" }}
          />
        </div>

        {/* Desktop Background */}
        <div className="hidden md:block absolute inset-0">
          <Image
            src={content.image.desktop.src}
            alt={content.image.desktop.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover animate-kenburns"
            style={{ objectPosition: content.image.desktop.focal || "50% 50%" }}
          />
        </div>

        {/* Cinematic Multi-layered Dark Gradients */}
        <div className="absolute inset-0 bg-ink/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/60" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink to-transparent" />
      </div>

      {/* Top Spacer for fixed header */}
      <div className="pt-24" />

      {/* Main Content Area */}
      <div className="container-x relative z-10 my-auto py-8">
        <div className="max-w-4xl">
          {/* Eyebrow */}
          <Reveal trigger="gate" delay={0.1}>
            <p className="eyebrow mb-4 sm:mb-6 text-bone/70">
              {content.eyebrow}
            </p>
          </Reveal>

          {/* Headline Display: ¿TÚ YA ERES DEL CLUB? */}
          <RevealLines
            lines={content.headlineLines}
            as="h1"
            trigger="gate"
            delay={0.2}
            className="display t-giant text-bone tracking-tight mb-4 sm:mb-6"
            lineClassName="leading-[0.85]"
          />

          {/* Brand & Subtext */}
          <Reveal trigger="gate" delay={0.5} className="space-y-4 max-w-xl">
            <div className="display text-2xl sm:text-3xl text-bone tracking-[0.25em] text-outline">
              {content.brand}
            </div>
            <div className="text-base sm:text-lg text-fog/90 leading-relaxed font-normal">
              {content.subLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </Reveal>

          {/* CTAs */}
          <Reveal trigger="gate" delay={0.7} className="mt-8 sm:mt-12 flex flex-wrap gap-4 items-center">
            <a
              href={content.primaryCta.href}
              className="btn btn-primary !min-h-[3.75rem] !px-8 text-xs sm:text-sm tracking-[0.25em]"
            >
              {content.primaryCta.label}
            </a>

            {content.secondaryCta && (
              <a
                href={content.secondaryCta.href}
                className="btn btn-ghost !min-h-[3.75rem] !px-8 text-xs sm:text-sm tracking-[0.25em]"
              >
                {content.secondaryCta.label}
              </a>
            )}
          </Reveal>
        </div>
      </div>

      {/* Discrete Scroll Cue */}
      <div className="relative z-10 pb-8 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-[1px] h-10 bg-bone/20 overflow-hidden">
          <div className="w-full h-full bg-bone animate-scrollcue" />
        </div>
        <span className="text-[0.62rem] tracking-[0.3em] uppercase text-ash/80 mt-2">
          Scroll
        </span>
      </div>
    </section>
  );
}
