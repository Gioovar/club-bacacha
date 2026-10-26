"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  LayoutDashboard,
  Users,
  Award,
  Filter,
  MessageSquare,
  Cake,
  Calendar,
  Gift,
  Share2,
  Megaphone,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  ExternalLink,
  X,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Miembros", href: "/admin/miembros", icon: Users },
  { name: "Actividad y Fidelización", href: "/admin/fidelizacion", icon: Award },
  { name: "Segmentos", href: "/admin/segmentos", icon: Filter },
  { name: "Comunicaciones", href: "/admin/comunicaciones", icon: MessageSquare },
  { name: "Cumpleaños", href: "/admin/cumpleanos", icon: Cake },
  { name: "Eventos", href: "/admin/eventos", icon: Calendar },
  { name: "Beneficios", href: "/admin/beneficios", icon: Gift },
  { name: "Referidos", href: "/admin/referidos", icon: Share2 },
  { name: "Campañas", href: "/admin/campanas", icon: Megaphone },
  { name: "Reportes", href: "/admin/reportes", icon: BarChart3 },
  { name: "Administradores", href: "/admin/administradores", icon: ShieldCheck },
  { name: "Configuración", href: "/admin/configuracion", icon: Settings },
];

interface Props {
  adminName?: string;
  adminRole?: string;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export function AdminSidebar({
  adminName = "Administrador Compartido",
  adminRole = "SUPER_ADMIN",
  isOpenMobile,
  onCloseMobile,
  onLogout,
}: Props) {
  const pathname = usePathname();

  const isCurrent = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-neutral-950 border-r border-neutral-900 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header / Logo */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-amber-400/40 shadow-sm flex-shrink-0 bg-neutral-900">
              <Image
                src="/logo.png"
                alt="Club Bacachá"
                fill
                sizes="36px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex flex-col">
              <BrandLogo size="md" className="tracking-[0.25em] text-white text-xl leading-none" />
              <span className="text-[0.58rem] font-mono tracking-[0.28em] text-neutral-400 uppercase mt-1">
                CRM & CONTROL
              </span>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-neutral-800">
          <div className="px-3 pb-2 pt-1 text-[0.6rem] font-mono uppercase tracking-[0.25em] text-neutral-400">
            MÓDULOS DEL CLUB
          </div>

          {NAV_ITEMS.map((item) => {
            const active = isCurrent(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  active
                    ? "bg-neutral-900 text-white font-semibold border border-neutral-800 shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active ? "text-amber-400" : "text-neutral-500 group-hover:text-neutral-300"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 font-mono">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / User Profile & Logout */}
        <div className="p-3 border-t border-neutral-900 space-y-2 bg-neutral-950/80">
          {/* External site link */}
          <a
            href="https://bacacha.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3.5 py-2 rounded-lg text-[0.7rem] text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <span className="font-mono">Ver sitio en vivo</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* User badge */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-850">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-xs font-medium text-neutral-200 truncate">{adminName}</span>
              <span className="text-[0.6rem] font-mono text-neutral-400 tracking-wider">
                {adminRole}
              </span>
            </div>

            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
