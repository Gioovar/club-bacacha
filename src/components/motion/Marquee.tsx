type Props = {
  items: string[];
  className?: string;
  separator?: string;
  /** Seconds per loop */
  speed?: number;
  reverse?: boolean;
};

/** Infinite horizontal marquee (pure CSS, GPU-friendly). */
export function Marquee({ items, className = "", separator = "•", speed = 38, reverse = false }: Props) {
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <span key={`${t}-${i}`} className="flex items-center">
          <span className="px-[0.35em]">{t}</span>
          <span className="px-[0.35em] text-ash/70" aria-hidden>
            {separator}
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className={`relative flex overflow-hidden whitespace-nowrap select-none ${className}`}>
      <div
        className="flex w-max animate-marquee motion-reduce:animate-none"
        style={{ animationDuration: `${speed}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
