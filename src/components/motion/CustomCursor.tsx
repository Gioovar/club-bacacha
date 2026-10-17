"use client";

import { useEffect, useRef, useState } from "react";
import { isFinePointer, motionAllowed } from "@/lib/motion";

/**
 * Desktop Custom Cursor.
 * Subtle, luxury, non-distracting dot that grows slightly and shows label over interactive elements.
 * Strictly disabled on touch devices and if reduced-motion is requested.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isFinePointer() || !motionAllowed()) return;
    setEnabled(true);

    const dot = dotRef.current;
    if (!dot) return;

    let posX = -100;
    let posY = -100;

    const onMouseMove = (e: MouseEvent) => {
      posX = e.clientX;
      posY = e.clientY;
      dot.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;

      // Check cursor label
      const target = (e.target as HTMLElement)?.closest("[data-cursor-label]");
      if (target) {
        setLabel(target.getAttribute("data-cursor-label"));
      } else {
        setLabel(null);
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      className="cursor-dot fixed top-0 left-0 pointer-events-none z-[999] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 will-change-transform"
    >
      <div
        className={`rounded-full border border-bone/60 flex items-center justify-center transition-all duration-300 ${
          label
            ? "w-16 h-16 bg-bone text-ink"
            : "w-3 h-3 bg-bone/80"
        }`}
      >
        {label && (
          <span className="text-[0.6rem] font-bold tracking-widest uppercase">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
