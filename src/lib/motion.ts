"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  gsap.defaults({ ease: "expo.out", duration: 1.2 });
}

export { gsap, ScrollTrigger, useGSAP };

/** Matches the inline head script: motion is allowed only with `html.motion-ok`. */
export function motionAllowed(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("motion-ok");
}

export function isFinePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/* ---------------- Age-gate state ---------------- */

export const GATE_EVENT = "bch:gate";

function subscribeGate(cb: () => void) {
  window.addEventListener(GATE_EVENT, cb);
  return () => window.removeEventListener(GATE_EVENT, cb);
}
const gateSnapshot = () => document.documentElement.classList.contains("gate-ok");

/** True once the visitor has confirmed legal age (instantly true on return visits). */
export function useGateOpen(): boolean {
  return useSyncExternalStore(subscribeGate, gateSnapshot, () => false);
}

/** True after hydration — avoids SSR/client mismatches for client-only UI. */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
