"use client";

import {
  Users, Bell, AlertTriangle, Syringe,
  ChevronRight, Plus, ArrowUpRight, Activity,
  RefreshCw, Loader2, Clock, MessageCircle, Phone,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useDashboardStats } from "@/lib/hooks/useDashboard";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIA_LABELS, type TratamientoCategoria, type Profile } from "@/types/database.types";

// ── Skeleton ──────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <div className="card-premium p-5 md:p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-muted" />
      </div>
      <div className="h-3 w-20 bg-muted rounded mb-2" />
      <div className="h-8 w-16 bg-muted rounded mb-1" />
      <div className="h-3 w-28 bg-muted rounded" />
    </div>
  );
}

// ── Badge de estado ────────────────────────────────────────────
function EstadoBadge({ estado, dias }: { estado: string; dias: number | null }) {
  if (estado === "vencido") {
    const diasAbs = Math.abs(dias ?? 0);
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 shrink-0">
        <AlertTriangle className="w-2.5 h-2.5" />
        {diasAbs > 0 ? `Hace ${diasAbs}d` : "Hoy"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
      <Clock className="w-2.5 h-2.5" />
      {dias === 0 ? "Vence hoy" : `${dias}d`}
    </span>
  );
}

// ── Greeting según hora ────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getFirstName(fullName: string) {
  // "Dra. Dennisse Arroyo" → "Dra. Dennisse"  |  "Juan Pablo" → "Juan"
  const parts = fullName.trim().split(" ");
  if (parts[0].toLowerCase().startsWith("dra") || parts[0].toLowerCase().startsWith("dr")) {
    return `${parts[0]} ${parts[1] ?? ""}`.trim();
  }
  return parts[0];
}

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useDashboardStats();
  const today = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1);

  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      (supabase as any).from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }: { data: Profile | null }) => setProfile(data));
    });
  }, []);

  const greeting = getGreeting();
  const name = profile ? getFirstName(profile.full_name) : "…";

  const stats = [
    {
      label: "Pacientes",
      value: isLoading ? "—" : String(data?.pacientesActivos ?? 0),
      sub:   "en base de datos",
      icon:  Users,
      href:  "/pacientes",
      color: "from-secondary/5 to-secondary/0",
    },
    {
      label: "Vencimientos",
      value: isLoading ? "—" : String((data?.vencidos ?? 0) + (data?.proximosVencer7 ?? 0)),
      sub:   "requieren atención",
      icon:  AlertTriangle,
      href:  "/renovaciones",
      color: "from-red-500/8 to-red-500/0",
      urgent: !isLoading && ((data?.vencidos ?? 0) + (data?.proximosVencer7 ?? 0)) > 0,
    },
    {
      label: "Por Vencer",
      value: isLoading ? "—" : String(data?.proximosVencer ?? 0),
      sub:   "próximos 30 días",
      icon:  Bell,
      href:  "/renovaciones",
      color: "from-amber-500/8 to-amber-500/0",
    },
    {
      label: "Catálogo",
      value: isLoading ? "—" : String(data?.procedimientosActivos ?? 0),
      sub:   "procedimientos",
      icon:  Syringe,
      href:  "/procedimientos",
      color: "from-primary/8 to-primary/0",
    },
  ];

  return (
    <div className="min-h-full bg-background">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-primary/60" />
            <span className="font-serif text-sm md:text-base font-semibold text-foreground">Panel de Control</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs text-muted-foreground font-medium hidden sm:block">{todayFormatted}</span>
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">

        {/* Welcome */}
        <div className="fade-up">
          <p className="label-elegant mb-1.5">Clínica Dra. Dennisse Arroyo</p>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground leading-tight">
            {greeting}, {name}
          </h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {todayFormatted}
          </p>
          <div className="gold-rule mt-5" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
            : stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Link
                    key={i}
                    href={stat.href}
                    className={`card-premium card-gold-top fade-up stagger-${i + 1} p-4 md:p-6 group block active:scale-[0.98] transition-transform`}
                  >
                    <div className="flex items-start justify-between mb-3 md:mb-4">
                      <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br ${stat.color} border ${stat.urgent ? "border-red-200" : "border-primary/12"} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${stat.urgent ? "text-red-500" : "text-primary"}`} />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-primary/30 group-hover:text-primary/60 transition-colors" />
                    </div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{stat.label}</p>
                    <p className={`text-2xl md:text-3xl font-semibold font-serif mb-1 ${stat.urgent ? "text-red-600" : "text-foreground"}`}>
                      {stat.value}
                    </p>
                    <p className={`text-xs font-medium ${stat.urgent ? "text-red-400" : "text-primary/70"}`}>
                      {stat.sub}
                    </p>
                  </Link>
                );
              })}
        </div>

        {/* Error state */}
        {isError && (
          <div className="card-premium p-5 border-red-200 bg-red-50/50 text-center text-sm text-red-600 fade-up">
            Error cargando datos. <button onClick={() => refetch()} className="underline font-semibold">Reintentar</button>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">

          {/* ── Renovaciones urgentes ─────────────────────── */}
          <div className="lg:col-span-2 card-premium fade-up stagger-2">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="label-elegant mb-0.5">Requieren atención</p>
                <h3 className="font-serif text-base font-semibold text-foreground">Renovaciones Urgentes</h3>
              </div>
              <Link href="/renovaciones" className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-semibold transition-colors group">
                Ver todas <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm">Cargando…</span>
              </div>
            )}

            {!isLoading && (data?.urgentes.length ?? 0) === 0 && (
              <div className="py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Sin urgencias</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No hay vencimientos en los próximos 7 días.
                </p>
              </div>
            )}

            {!isLoading && (data?.urgentes.length ?? 0) > 0 && (
              <div className="divide-y divide-border/60">
                {data!.urgentes.map((r) => {
                  const initials = r.paciente_nombre
                    .split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
                  const waLink = r.paciente_telefono
                    ? `https://wa.me/51${r.paciente_telefono.replace(/\D/g, "").slice(-9)}`
                    : null;
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors group">
                      {/* Avatar → link al paciente */}
                      <Link href={`/pacientes/${r.paciente_id}`} className="shrink-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs hover:bg-primary/20 transition-colors">
                          {initials}
                        </div>
                      </Link>

                      {/* Info → link al paciente */}
                      <Link href={`/pacientes/${r.paciente_id}`} className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {r.paciente_nombre}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.tratamiento_nombre}
                          <span className="mx-1.5 text-border">·</span>
                          {CATEGORIA_LABELS[r.categoria as TratamientoCategoria] ?? r.categoria}
                        </p>
                      </Link>

                      {/* Badge + botón WA */}
                      <div className="flex items-center gap-2 shrink-0">
                        <EstadoBadge estado={r.estado_actual} dias={r.dias_para_vencer} />
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                            title={`WhatsApp ${r.paciente_nombre}`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!isLoading && !data?.needsMigration && (
              <div className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-red-600">{data?.vencidos ?? 0}</span> vencidos
                  <span className="mx-2 text-border">·</span>
                  <span className="font-semibold text-amber-600">{data?.proximosVencer7 ?? 0}</span> vencen en ≤7 días
                </p>
                <Link href="/renovaciones" className="text-xs text-primary font-semibold hover:underline">
                  Ver módulo →
                </Link>
              </div>
            )}
          </div>

          {/* ── Accesos rápidos + resumen ──────────────────── */}
          <div className="space-y-4 fade-up stagger-3">
            <div className="card-premium p-5">
              <p className="label-elegant mb-3">Accesos Rápidos</p>
              <div className="space-y-2">
                {[
                  { href: "/pacientes",    icon: Plus,    label: "Nuevo Paciente",  sub: "Registrar en base de datos", bg: "bg-secondary/8",   color: "text-secondary" },
                  { href: "/renovaciones", icon: Bell,    label: "Renovaciones",    sub: "Control de vencimientos",    bg: "bg-amber-50",      color: "text-amber-600" },
                  { href: "/pacientes",    icon: Users,   label: "Pacientes",       sub: "Historias clínicas",         bg: "bg-primary/8",     color: "text-primary"  },
                  { href: "/procedimientos", icon: Syringe, label: "Catálogo",      sub: "Procedimientos y vigencias", bg: "bg-emerald-50",    color: "text-emerald-600" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/4 active:scale-[0.98] transition-all group"
                    >
                      <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.sub}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Resumen de estados */}
            {!isLoading && !data?.needsMigration && (
              <div className="card-premium p-5">
                <p className="label-elegant mb-3">Estado de Renovaciones</p>
                <div className="space-y-2.5">
                  {[
                    { label: "Vencidos",          value: data?.vencidos ?? 0,        dot: "bg-red-500",    text: "text-red-600"    },
                    { label: "Vencen en 7 días",  value: data?.proximosVencer7 ?? 0, dot: "bg-amber-500",  text: "text-amber-600"  },
                    { label: "Vencen en 30 días", value: data?.proximosVencer ?? 0,  dot: "bg-yellow-400", text: "text-yellow-600" },
                  ].map(({ label, value, dot, text }) => (
                    <Link key={label} href="/renovaciones" className="flex items-center justify-between hover:opacity-80 transition-opacity">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                      <span className={`text-sm font-bold ${value > 0 ? text : "text-muted-foreground"}`}>
                        {value}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Contacto rápido clínica */}
            <div className="card-premium p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">WA Clínica</p>
                <p className="text-sm font-semibold text-foreground">+51 936 196 001</p>
              </div>
              <a
                href="https://wa.me/51936196001"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
