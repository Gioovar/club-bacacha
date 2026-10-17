"use client";

import { useEffect, useRef, useState } from "react";
import { GATE_EVENT } from "@/lib/motion";

const START_TIME_SECONDS = 70; // 1 minuto con 10 segundos

/**
 * Background Audio Player for Club Bacachá.
 * Song: José José - Quiero Perderme Contigo
 * Starts automatically at 01:10 (70s) upon entry (Age Gate click or first interaction).
 * Supports explicit, foolproof pause/play toggle without re-triggering auto-play.
 */
export function BackgroundAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const userPausedRef = useRef(false);
  const hasSeekedRef = useRef(false);

  const playAtStart = () => {
    const audio = audioRef.current;
    if (!audio || userPausedRef.current) return;

    if (!hasSeekedRef.current) {
      audio.currentTime = START_TIME_SECONDS;
      hasSeekedRef.current = true;
    }

    audio.play().catch(() => {
      // Browser autoplay policy waiting for user interaction
    });
  };

  useEffect(() => {
    // 1. Trigger when Age Gate is confirmed ("SÍ, ENTRAR")
    const onGate = () => {
      if (!userPausedRef.current) {
        playAtStart();
      }
    };
    window.addEventListener(GATE_EVENT, onGate);

    // 2. Fallback on first user interaction anywhere (click, touch, key)
    const onFirstInteraction = (e: Event) => {
      // Don't auto-start if the user clicked inside our audio player button
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-audio-control]")) return;

      if (!userPausedRef.current) {
        playAtStart();
      }
      removeInteractionListeners();
    };

    const removeInteractionListeners = () => {
      window.removeEventListener("click", onFirstInteraction, true);
      window.removeEventListener("touchstart", onFirstInteraction, true);
      window.removeEventListener("keydown", onFirstInteraction, true);
    };

    window.addEventListener("click", onFirstInteraction, true);
    window.addEventListener("touchstart", onFirstInteraction, true);
    window.addEventListener("keydown", onFirstInteraction, true);

    // Try initial play in case already permitted
    const t = setTimeout(() => {
      if (!userPausedRef.current) {
        playAtStart();
      }
    }, 300);

    return () => {
      clearTimeout(t);
      window.removeEventListener(GATE_EVENT, onGate);
      removeInteractionListeners();
    };
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      userPausedRef.current = true;
      audio.pause();
    } else {
      userPausedRef.current = false;
      if (!hasSeekedRef.current) {
        audio.currentTime = START_TIME_SECONDS;
        hasSeekedRef.current = true;
      }
      audio.play().catch(console.error);
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src="/audio/jose-jose.mp3"
        preload="auto"
        loop
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Floating Audio Controller */}
      <div
        data-audio-control
        className="fixed bottom-6 right-6 z-50 select-none"
      >
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-ink/90 backdrop-blur-md border border-bone/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
          {/* Animated Soundwave bars */}
          <div className="flex items-center gap-[2.5px] h-3.5">
            <span
              className={`w-[2.5px] bg-bone rounded-full transition-all ${
                isPlaying
                  ? "h-3.5 animate-[pulse_0.7s_ease-in-out_infinite]"
                  : "h-1 opacity-30"
              }`}
            />
            <span
              className={`w-[2.5px] bg-bone rounded-full transition-all ${
                isPlaying
                  ? "h-2.5 animate-[pulse_0.5s_ease-in-out_infinite_0.15s]"
                  : "h-1 opacity-30"
              }`}
            />
            <span
              className={`w-[2.5px] bg-bone rounded-full transition-all ${
                isPlaying
                  ? "h-3.5 animate-[pulse_0.8s_ease-in-out_infinite_0.3s]"
                  : "h-1 opacity-30"
              }`}
            />
          </div>

          {/* Song info */}
          <div className="hidden sm:flex flex-col text-left pr-2 border-r border-bone/15">
            <span className="text-[0.68rem] tracking-[0.2em] uppercase font-mono font-medium text-bone leading-tight">
              JOSÉ JOSÉ
            </span>
            <span className="text-[0.55rem] tracking-[0.15em] text-ash font-mono uppercase leading-tight">
              QUIERO PERDERME CONTIGO
            </span>
          </div>

          {/* Dedicated Clear PAUSE / PLAY Button */}
          <button
            type="button"
            onClick={handleToggle}
            aria-label={isPlaying ? "Pausar música" : "Reproducir música"}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bone text-ink hover:bg-white transition-all font-mono font-bold text-[0.68rem] tracking-[0.18em] uppercase shadow-md active:scale-95 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <svg
                  className="w-3 h-3 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                <span>PAUSA</span>
              </>
            ) : (
              <>
                <svg
                  className="w-3 h-3 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>PLAY</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
