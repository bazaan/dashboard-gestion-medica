"use client";

import {
  LayoutDashboard, Users, Settings,
  LogOut, ChevronRight, X, Menu, Bell, Syringe, MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Profile, UserRole } from "@/types/database.types";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardStats } from "@/lib/hooks/useDashboard";
import { NotificacionesPermiso } from "@/components/NotificacionesPermiso";

const NAV_LINKS = [
  { name: "Panel",          href: "/",               icon: LayoutDashboard, roles: ["admin", "doctor", "recepcion"] as UserRole[] },
  { name: "Pacientes",      href: "/pacientes",      icon: Users,           roles: ["admin", "doctor", "recepcion"] as UserRole[] },
  { name: "Renovaciones",   href: "/renovaciones",   icon: Bell,            roles: ["admin", "doctor", "recepcion"] as UserRole[] },
  { name: "Procedimientos", href: "/procedimientos", icon: Syringe,             roles: ["admin", "doctor", "recepcion"] as UserRole[] },
  { name: "Plantillas WA",  href: "/plantillas",     icon: MessageSquareText,   roles: ["admin", "doctor"] as UserRole[] },
  { name: "Config",         href: "/configuracion",  icon: Settings,            roles: ["admin"] as UserRole[] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  doctor: "Médico Tratante",
  recepcion: "Recepción",
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ─── Contenido de navegación (reutilizado en desktop y drawer móvil) ──────────
function NavContent({
  profile,
  visibleLinks,
  pathname,
  onLogout,
  onClose,
  urgentCount = 0,
}: {
  profile: Profile;
  visibleLinks: typeof NAV_LINKS;
  pathname: string;
  onLogout: () => void;
  onClose?: () => void;
  urgentCount?: number;
  role?: string;
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-6 pt-7 pb-6">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 transition-all md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://qzmgizrvdukyxvpgclvd.supabase.co/storage/v1/object/public/CLINICADENNISSE/firma-logo.png"
          alt="Clínica Dra. Dennisse Arroyo"
          className="w-full max-w-[170px] object-contain"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        <div className="mt-5 gold-rule" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-2 space-y-0.5">
        <p className="label-elegant text-white/25 px-3 mb-3">Navegación</p>
        {visibleLinks.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm group ${
                isActive ? "bg-primary/20 text-white" : "text-white/55 hover:bg-white/6 hover:text-white/90"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative shrink-0">
                <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? "text-primary" : "text-white/40 group-hover:text-white/70"}`} />
                {link.href === "/renovaciones" && urgentCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                    {urgentCount > 9 ? "9+" : urgentCount}
                  </span>
                )}
              </div>
              <span className="flex-1">{
                link.name === "Panel" ? "Panel de Control" :
                link.name === "Config" ? "Configuración" :
                link.name
              }</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Notificaciones de acceso — solo para admin/doctor */}
      {(profile.role === "admin" || profile.role === "doctor") && (
        <NotificacionesPermiso />
      )}

      {/* Footer — user card */}
      <div className="px-4 pb-6 pt-4 space-y-4">
        <div className="gold-rule" />
        <div className="bg-white/5 rounded-xl p-3.5 border border-white/8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/25 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {getInitials(profile.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
              <p className="text-xs text-primary/70">{ROLE_LABELS[profile.role]}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/40 hover:bg-red-500/15 hover:text-red-400 transition-all text-xs font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: dashStats } = useDashboardStats();
  const urgentCount = (dashStats?.vencidos ?? 0) + (dashStats?.proximosVencer7 ?? 0);

  const visibleLinks = NAV_LINKS.filter((l) => l.roles.includes(profile.role));

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada correctamente");
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* ── DESKTOP sidebar ─────────────────────────────────── */}
      <aside className="w-64 bg-secondary text-secondary-foreground hidden md:flex flex-col sidebar-glow z-20 shrink-0 relative">
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
        <NavContent
          profile={profile}
          visibleLinks={visibleLinks}
          pathname={pathname}
          onLogout={handleLogout}
          urgentCount={urgentCount}
        />
      </aside>

      {/* ── MOBILE top bar ──────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-secondary flex items-center justify-between px-4 border-b border-white/8">
        {/* Logo compacto */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://qzmgizrvdukyxvpgclvd.supabase.co/storage/v1/object/public/CLINICADENNISSE/firma-logo.png"
          alt="Clínica Dra. Dennisse Arroyo"
          className="h-7 object-contain"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── MOBILE bottom nav ───────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-secondary border-t border-white/8 flex items-center justify-around"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {visibleLinks.slice(0, 3).map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const Icon = link.icon;
          const showBadge = link.href === "/renovaciones" && urgentCount > 0;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-0.5 px-4 pt-2.5 pb-1 min-w-0 relative"
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-primary" : "text-white/35"}`} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                    {urgentCount > 9 ? "9+" : urgentCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-white/35"}`}>
                {link.name}
              </span>
            </Link>
          );
        })}
        {/* Botón de menú/perfil */}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-0.5 px-4 pt-2.5 pb-1"
        >
          <div className="w-5 h-5 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center text-primary text-[8px] font-bold">
            {getInitials(profile.full_name)}
          </div>
          <span className="text-[10px] font-medium text-white/35">Más</span>
        </button>
      </nav>

      {/* ── MOBILE drawer overlay ────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/50 md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed top-0 left-0 bottom-0 z-[70] w-72 bg-secondary flex flex-col md:hidden relative overflow-y-auto"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
              <NavContent
                profile={profile}
                visibleLinks={visibleLinks}
                pathname={pathname}
                onLogout={handleLogout}
                onClose={() => setMobileOpen(false)}
                urgentCount={urgentCount}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
