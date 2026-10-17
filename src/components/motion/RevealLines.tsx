"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, motionAllowed, useGSAP, useGateOpen } from "@/lib/motion";

type Props = {
  lines: ReactNode[];
  as?: ElementType;
  className?: string;
  lineClassName?: string;
  /** "scroll" (default) reveals on enter; "gate" waits for the age gate. */
  trigger?: "scroll" | "gate";
  delay?: number;
  stagger?: number;
  start?: string;
  id?: string;
};

/** Mask-reveal headline, line by line. Fully visible without JS / reduced motion. */
export function RevealLines({
  lines,
  as: Tag = "h2",
  className = "",
  lineClassName = "",
  trigger = "scroll",
  delay = 0,
  stagger = 0.09,
  start = "top 85%",
  id,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const gateOpen = useGateOpen();

  useGSAP(
    () => {
      if (!motionAllowed() || !ref.current) return;
      const inner = ref.current.querySelectorAll(".line-inner");
      if (trigger === "gate") {
        if (!gateOpen) return;
        gsap.to(inner, { y: 0, duration: 1.4, stagger, delay, ease: "expo.out" });
        return;
      }
      gsap.to(inner, {
        y: 0,
        duration: 1.3,
        stagger,
        delay,
        ease: "expo.out",
        scrollTrigger: { trigger: ref.current, start, once: true },
      });
    },
    { scope: ref, dependencies: [gateOpen, trigger] },
  );

  return (
    <Tag ref={ref} id={id} data-reveal="lines" className={className}>
      {lines.map((line, i) => (
        <span key={i} className={`line-mask ${lineClassName}`}>
          <span className="line-inner">{line}</span>
        </span>
      ))}
    </Tag>
  );
}
