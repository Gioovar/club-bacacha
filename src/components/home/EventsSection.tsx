"use client";

import Image from "next/image";
import Link from "next/link";
import type { ClubEvent } from "@/lib/content/types";
import { formatEventDate } from "@/lib/site";
import { RevealLines } from "@/components/motion/RevealLines";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  eyebrow: string;
  titleLines: string[];
  items: ClubEvent[];
};

/**
 * Events Section.
 * "PRÓXIMOS EVENTOS"
 * Large visual event cards with dates, times, locations, and direct reservation triggers.
 * Ready to connect with Supabase events table.
 */
export function EventsSection({ eyebrow, titleLines, items }: Props) {
  return (
    <section id="eventos" className="py-24 sm:py-36 bg-coal border-t border-bone/5">
      <div className="container-x">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16 sm:mb-24">
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

          <Reveal delay={0.2}>
            <p className="text-sm text-ash max-w-xs font-light">
              Acceso prioritario y reservación exclusiva para miembros del Club.
            </p>
          </Reveal>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {items.map((event) => {
            const date = formatEventDate(event.date);
            return (
              <div
                key={event.id}
                className="group flex flex-col justify-between bg-ink border border-bone/10 overflow-hidden"
              >
                {/* Visual Media Container */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-graphite">
                  <Image
                    src={event.image.src}
                    alt={event.image.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />

                  {/* Badge: Members Only */}
                  {event.membersOnly && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-ink/80 backdrop-blur-sm border border-bone/20 text-[0.6rem] tracking-[0.25em] uppercase text-bone">
                      SÓLO MIEMBROS
                    </div>
                  )}

                  {/* Date Badge */}
                  <div className="absolute top-4 right-4 bg-bone text-ink p-3 text-center min-w-[3.5rem] flex flex-col justify-center">
                    <span className="display text-2xl leading-none font-bold">
                      {date.day}
                    </span>
                    <span className="text-[0.6rem] tracking-wider uppercase font-semibold">
                      {date.month}
                    </span>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-6 sm:p-8 flex flex-col flex-grow justify-between">
                  <div>
                    <div className="flex items-center gap-4 text-xs font-mono text-ash tracking-wider mb-2">
                      <span>{date.weekday}</span>
                      <span>•</span>
                      <span>{event.time} HRS</span>
                      <span>•</span>
                      <span>{event.city}</span>
                    </div>

                    <h3 className="display text-2xl sm:text-3xl text-bone mb-3 tracking-tight uppercase group-hover:text-white transition-colors">
                      {event.name}
                    </h3>

                    <p className="text-sm text-fog font-light leading-relaxed mb-4">
                      {event.description}
                    </p>

                    <p className="text-xs text-ash tracking-wider uppercase font-mono mb-6">
                      📍 {event.venue}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 pt-4 border-t border-bone/10">
                    <a
                      href="#unete"
                      className="btn btn-primary flex-1 !min-h-[3rem] !text-xs tracking-[0.2em]"
                    >
                      RESERVAR
                    </a>
                    <Link
                      href={`/eventos#${event.slug}`}
                      className="btn btn-ghost flex-1 !min-h-[3rem] !text-xs tracking-[0.2em]"
                    >
                      VER EVENTO
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
