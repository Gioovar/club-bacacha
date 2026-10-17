"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, motionAllowed, useGSAP, useGateOpen } from "@/lib/motion";

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  trigger?: "scroll" | "gate";
  start?: string;
  /** Animate direct children one after another instead of the wrapper. */
  stagger?: number;
};

/** Soft fade-up. */
export function Reveal({ children, as: Tag = "div", className = "", delay = 0, trigger = "scroll", start = "top 88%", stagger }: Props) {
  const ref = useRef<HTMLElement>(null);
  const gateOpen = useGateOpen();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !motionAllowed()) return;
      const targets = stagger ? Array.from(el.children) : el;
      if (stagger) {
        gsap.set(el, { opacity: 1, y: 0 });
        gsap.set(targets, { opacity: 0, y: 24 });
      }
      const vars = { opacity: 1, y: 0, duration: 1.2, delay, stagger, ease: "expo.out" };
      if (trigger === "gate") {
        if (gateOpen) gsap.to(targets, vars);
        return;
      }
      gsap.to(targets, { ...vars, scrollTrigger: { trigger: el, start, once: true } });
    },
    { scope: ref, dependencies: [gateOpen] },
  );

  return (
    <Tag ref={ref} data-reveal="fade" className={className}>
      {children}
    </Tag>
  );
}
