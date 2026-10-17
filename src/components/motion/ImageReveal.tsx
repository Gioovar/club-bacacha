"use client";

import Image from "next/image";
import { useRef } from "react";
import type { ImageAsset } from "@/lib/content/types";
import { gsap, motionAllowed, useGSAP } from "@/lib/motion";

type Props = {
  image: ImageAsset;
  sizes: string;
  className?: string;
  /** Parallax speed (-1..1). 0 disables parallax. */
  speed?: number;
  /** Cinematic hover zoom (desktop). */
  hover?: boolean;
  preload?: boolean;
  cursorLabel?: string;
};

/**
 * Image reveal: clip-path wipe from bottom + subtle de-zoom, optional very light
 * parallax. The wrapper defines the aspect ratio via className.
 */
export function ImageReveal({ image, sizes, className = "", speed = 0, hover = true, preload = false, cursorLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !motionAllowed()) return;
      const img = el.querySelector("img");
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 90%", once: true } });
      tl.to(el, { clipPath: "inset(0% 0 0 0)", duration: 1.5, ease: "expo.inOut" }).to(
        img,
        { scale: 1, duration: 1.9, ease: "expo.out" },
        0.1,
      );

      if (speed !== 0 && img) {
        const wrap = el.querySelector("[data-parallax]");
        const amt = speed * 40;
        gsap.fromTo(
          wrap,
          { yPercent: -amt },
          {
            yPercent: amt,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      }
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      data-reveal="image"
      data-cursor={cursorLabel ? "label" : undefined}
      data-cursor-label={cursorLabel}
      className={`group relative overflow-hidden bg-graphite ${className}`}
    >
      <div data-parallax className={`absolute ${speed ? "-inset-y-[10%] inset-x-0" : "inset-0"}`}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          preload={preload}
          className={`object-cover ${hover ? "transition-transform duration-[1.6s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.045]" : ""}`}
          style={{ objectPosition: image.focal ?? "50% 50%" }}
        />
      </div>
    </div>
  );
}
