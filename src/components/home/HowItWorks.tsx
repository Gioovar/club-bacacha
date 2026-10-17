"use client";

import type { Step } from "@/lib/content/types";
import { RevealLines } from "@/components/motion/RevealLines";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  eyebrow: string;
  titleLines: string[];
  steps: Step[];
};

/**
 * How It Works Section.
 * Ultra-minimalist 3-step sequence.
 * 01 ÚNETE -> 02 RECIBE TU MEMBRESÍA -> 03 DESBLOQUEA BENEFICIOS.
 */
export function HowItWorks({ eyebrow, titleLines, steps }: Props) {
  return (
    <section className="py-24 sm:py-36 bg-ink border-t border-bone/5">
      <div className="container-x">
        <div className="max-w-2xl mb-16 sm:mb-24">
          <Reveal>
            <p className="eyebrow mb-4 text-ash">{eyebrow}</p>
          </Reveal>
          <RevealLines
            lines={titleLines}
            as="h2"
            className="display t-lg text-bone tracking-tight"
          />
        </div>

        {/* 3 Large Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 border-t border-bone/10 pt-12">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col justify-between group">
              <div>
                <span className="display text-6xl sm:text-7xl lg:text-8xl text-bone/20 group-hover:text-bone/50 transition-colors duration-500 block mb-6">
                  {step.number}
                </span>
                <h3 className="display text-2xl sm:text-3xl text-bone tracking-tight mb-4 uppercase">
                  {step.title}
                </h3>
                <p className="text-base text-fog font-light leading-relaxed max-w-xs">
                  {step.text}
                </p>
              </div>

              <div className="w-12 h-[1px] bg-bone/20 mt-10 group-hover:w-full group-hover:bg-bone transition-all duration-700" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
