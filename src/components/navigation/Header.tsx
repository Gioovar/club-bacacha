"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

type Props = {
  activeSection?: string;
};

const NAV_LINKS = [
  { label: "CLUB", href: "#club" },
  { label: "BENEFICIOS", href: "#beneficios" },
  { label: "EVENTOS", href: "#eventos" },
];

export function Header({ activeSection }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-ink/85 backdrop-blur-md border-b border-bone/10 py-3.5"
            : "bg-transparent py-6"
        }`}
      >
        <div className="container-x flex items-center justify-between">
          {/* Logo Bacachá pequeño */}
          <div className="flex items-center">
            <BrandLogo href="/" size="sm" />
          </div>

          {/* Desktop Navigation */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-10"
          >
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[0.72rem] tracking-[0.28em] font-medium text-fog hover:text-bone transition-colors duration-300 link-line"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/mi-membresia"
              className="text-[0.68rem] tracking-[0.24em] font-medium text-ash hover:text-bone transition-colors duration-300 mr-2"
            >
              MI MEMBRESÍA
            </Link>
            <a
              href="#unete"
              className="btn btn-primary !min-h-[2.5rem] !px-6 !text-[0.72rem]"
            >
              ÚNETE
            </a>
          </div>

          {/* Mobile Actions: ÚNETE button + Hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <a
              href="#unete"
              onClick={closeMenu}
              className="btn btn-primary !min-h-[2.25rem] !px-4 !text-[0.7rem]"
            >
              ÚNETE
            </a>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              className="w-10 h-10 flex flex-col justify-center items-center gap-1.5 text-bone focus:outline-none"
            >
              <span
                className={`w-6 h-[1.5px] bg-bone transition-all duration-300 ${
                  menuOpen ? "rotate-45 translate-y-[4.5px]" : ""
                }`}
              />
              <span
                className={`w-6 h-[1.5px] bg-bone transition-all duration-300 ${
                  menuOpen ? "-rotate-45 -translate-y-[3px]" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-ink flex flex-col justify-between p-8 pt-28 transition-all duration-500 md:hidden ${
          menuOpen
            ? "opacity-100 pointer-events-auto translate-y-0"
            : "opacity-0 pointer-events-none -translate-y-4"
        }`}
      >
        <nav
          aria-label="Navegación móvil"
          className="flex flex-col gap-8 text-left mt-6"
        >
          {NAV_LINKS.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="display text-[3rem] text-bone tracking-tight hover:text-white"
            >
              <span className="text-ash/60 text-xs font-sans tracking-[0.3em] block mb-1">
                0{i + 1}
              </span>
              {item.label}
            </a>
          ))}
          <Link
            href="/mi-membresia"
            onClick={closeMenu}
            className="display text-[2.2rem] text-ash tracking-tight hover:text-bone pt-4 border-t border-bone/10"
          >
            MI MEMBRESÍA
          </Link>
        </nav>

        <div className="flex flex-col gap-6 pt-8 border-t border-bone/10">
          <a
            href="#unete"
            onClick={closeMenu}
            className="btn btn-primary w-full !min-h-[3.5rem] !text-base"
          >
            ÚNETE AL CLUB
          </a>
          <p className="text-xs text-ash tracking-widest uppercase text-center">
            Acapulco · Club Privado
          </p>
        </div>
      </div>
    </>
  );
}
