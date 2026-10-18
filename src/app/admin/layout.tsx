import { Metadata } from "next";
import { Suspense } from "react";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";


export const metadata: Metadata = {
  title: "Administración & CRM | Club Bacachá",
  description: "Centro de gestión privada, fidelización y miembros de Club Bacachá.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-neutral-400">
          <div className="w-8 h-8 border-2 border-neutral-700 border-t-amber-400 rounded-full animate-spin" />
        </div>
      }
    >
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </Suspense>
  );
}
