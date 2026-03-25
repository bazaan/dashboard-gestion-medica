"use client";

import {
  Users, CalendarCheck2, TrendingUp, Clock,
  ChevronRight, ArrowUpRight, Sparkles, Activity,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATS = [
  { label: "Pacientes Hoy",     value: "12",       sub: "+2 vs ayer",               icon: Users,          color: "from-secondary/5 to-secondary/0" },
  { label: "Citas Confirmadas", value: "10",        sub: "83% tasa confirmación",     icon: CalendarCheck2, color: "from-primary/8 to-primary/0" },
  { label: "Ingresos del Día",  value: "S/ 4,200",  sub: "↑ 18% vs semana anterior", icon: TrendingUp,     color: "from-emerald-500/5 to-emerald-500/0" },
];

const CITAS_HOY = [
  { hora: "09:00", nombre: "María González",  tratamiento: "Hilos Delta Lifting®", estado: "confirmada", duracion: "1h 30m", initials: "MG" },
  { hora: "10:30", nombre: "Lucía Fernández", tratamiento: "Reshape Facial",       estado: "en_sala",    duracion: "45m",    initials: "LF" },
  { hora: "11:45", nombre: "Camila Rojas",    tratamiento: "Visage 3D",            estado: "pendiente",  duracion: "1h",     initials: "CR" },
  { hora: "14:00", nombre: "Valeria Mendoza", tratamiento: "Evaluación Inicial",   estado: "pendiente",  duracion: "30m",    initials: "VM" },
  { hora: "15:30", nombre: "Andrea Torres",   tratamiento: "PRP Facial",           estado: "confirmada", duracion: "1h",     initials: "AT" },
];

const ESTADO_CONFIG = {
  confirmada: { label: "Confirmada", class: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  en_sala:    { label: "En Sala",    class: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500" },
  pendiente:  { label: "Pendiente",  class: "bg-slate-50 text-slate-600 border-slate-200",       dot: "bg-slate-400" },
};

export default function Dashboard() {
  const today = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1);

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
            <div className="flex items-center gap-1.5 bg-primary/8 border border-primary/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary font-medium">En vivo</span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
        {/* Welcome */}
        <div className="fade-up">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-elegant mb-1.5">Resumen del Día</p>
              <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground leading-tight">
                Buenos días, Dra. Arroyo
              </h2>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Tienes <span className="font-semibold text-foreground">12 pacientes</span> programados hoy.
              </p>
            </div>
            <Link href="/agenda" className="btn-primary text-sm shrink-0 hidden sm:flex">
              <CalendarCheck2 className="w-4 h-4" />
              Ver Agenda
            </Link>
          </div>
          <div className="gold-rule mt-5" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={`card-premium card-gold-top fade-up stagger-${i + 1} p-5 md:p-6 group cursor-default`}>
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br ${stat.color} border border-primary/12 flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-primary/30 group-hover:text-primary/60 transition-colors" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{stat.label}</p>
                <p className="text-2xl md:text-3xl font-semibold text-foreground font-serif mb-1">{stat.value}</p>
                <p className="text-xs text-primary/70 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />{stat.sub}
                </p>
              </div>
            );
          })}
        </div>

        {/* Citas de hoy */}
        <div className="card-premium fade-up stagger-4">
          <div className="px-4 md:px-6 py-4 md:py-5 border-b border-border flex items-center justify-between">
            <div>
              <p className="label-elegant mb-0.5">Programación</p>
              <h3 className="font-serif text-base md:text-lg font-semibold text-foreground">Citas de Hoy</h3>
            </div>
            <Link href="/agenda" className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-semibold transition-colors group">
              Ver agenda <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {CITAS_HOY.map((cita, i) => {
              const config = ESTADO_CONFIG[cita.estado as keyof typeof ESTADO_CONFIG];
              return (
                <div key={i} className="px-4 md:px-6 py-3.5 md:py-4 flex items-center gap-3 md:gap-5 hover:bg-muted/30 transition-colors cursor-pointer group">
                  <div className="w-12 md:w-14 text-center shrink-0">
                    <p className="text-xs md:text-sm font-bold text-primary font-mono">{cita.hora}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
                      <Clock className="w-2.5 h-2.5 hidden sm:block" />{cita.duracion}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-border shrink-0 hidden sm:block" />
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {cita.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{cita.nombre}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{cita.tratamiento}</p>
                  </div>
                  <div className="shrink-0">
                    <span className={`flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold border ${config.class}`}>
                      <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${config.dot}`} />
                      <span className="hidden sm:inline">{config.label}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 md:px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{CITAS_HOY.length}</span> citas programadas
            </p>
            <div className="flex items-center gap-2 md:gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-emerald-500" />Confirmadas: 2</span>
              <span className="hidden sm:flex items-center gap-1 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-amber-500" />En sala: 1</span>
              <span className="hidden sm:flex items-center gap-1 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-slate-400" />Pendientes: 2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
