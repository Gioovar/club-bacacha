import Link from "next/link";

type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
};

/**
 * Editorial wordmark for BACACHÁ.
 * Sharp display typography, tight tracking, timeless luxury feel.
 */
export function BrandLogo({ className = "", size = "md", href }: Props) {
  const sizeClasses = {
    sm: "text-[1.2rem] tracking-[0.24em]",
    md: "text-[1.6rem] tracking-[0.22em]",
    lg: "text-[2.2rem] tracking-[0.2em]",
  }[size];

  const content = (
    <span
      className={`display inline-flex items-baseline font-normal text-bone hover:text-white transition-colors duration-300 ${sizeClasses} ${className}`}
    >
      <span>BACACHÁ</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="Club Bacachá — Inicio">
        {content}
      </Link>
    );
  }

  return content;
}
