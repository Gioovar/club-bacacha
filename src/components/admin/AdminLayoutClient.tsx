"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar, NAV_ITEMS } from "./AdminSidebar";
import { AdminLoginGate } from "./AdminLoginGate";
import { Menu, RefreshCw, Bell, Search } from "lucide-react";

interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface Props {
  children: React.ReactNode;
}

export function AdminLayoutClient({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pathname = usePathname();
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/auth/status", { cache: "no-store" });
      const data = await res.json();
      if (data.authenticated) {
        setAuthenticated(true);
        setUser(data.user);
      } else {
        setAuthenticated(false);
        setSetupNeeded(Boolean(data.setupNeeded));
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch {}
    setAuthenticated(false);
    router.push("/admin");
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-neutral-400 space-y-4">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-amber-400 rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-widest uppercase">Cargando Centro de Control...</span>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <AdminLoginGate
        isSetupNeeded={setupNeeded}
        onSuccess={() => {
          setAuthenticated(true);
          checkAuth();
        }}
      />
    );
  }

  // Find active nav item name for topbar
  const currentItem = NAV_ITEMS.find((item) =>
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
  );

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col">
      {/* Sidebar */}
      <AdminSidebar
        adminName={user?.name || "Administrador Compartido"}
        adminRole={user?.role || "SUPER_ADMIN"}
        isOpenMobile={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen flex-1">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900"
              aria-label="Abrir Menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white tracking-wide">
                {currentItem?.name || "Panel de Administración"}
              </span>
              <span className="text-[0.62rem] font-mono text-neutral-400">
                Club Bacachá · Producción
              </span>
            </div>
          </div>

          {/* Quick Actions in Navbar */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              title="Refrescar datos"
              disabled={isPending}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin text-amber-400" : ""}`} />
            </button>

            <div className="h-4 w-px bg-neutral-800" />

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[0.68rem] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>SISTEMA EN VIVO</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
