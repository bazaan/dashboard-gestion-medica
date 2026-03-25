"use client";

import {
  CalendarDays, Clock, MapPin, Plus, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

const CITAS = [
  { hora: "09:00", horaFin: "10:30", nombre: "María González",  tratamiento: "Hilos Delta Lifting®", duracion: "1h 30m", estado: "confirmada", initials: "MG", color: "border-l-emerald-400", colorBg: "bg-emerald-50/50" },
  { hora: "10:30", horaFin: "11:15", nombre: "Lucía Fernández", tratamiento: "Reshape Facial",       duracion: "45m",    estado: "en_sala",    initials: "LF", color: "border-l-amber-400",   colorBg: "bg-amber-50/50" },
  { hora: "11:45", horaFin: "12:45", nombre: "Camila Rojas",    tratamiento: "Visage 3D",            duracion: "1h",     estado: "pendiente",  initials: "CR", color: "border-l-slate-300",   colorBg: "bg-slate-50/40" },
  { hora: "14:00", horaFin: "14:30", nombre: "Valeria Mendoza", tratamiento: "Evaluación Inicial",   duracion: "30m",    estado: "pendiente",  initials: "VM", color: "border-l-slate-300",   colorBg: "bg-slate-50/40" },
  { hora: "15:30", horaFin: "16:30", nombre: "Andrea Torres",   tratamiento: "PRP Facial",           duracion: "1h",     estado: "confirmada", initials: "AT", color: "border-l-emerald-400", colorBg: "bg-emerald-50/50" },
];

const ESTADO_ICON: Record<string, React.ElementType> = { confirmada: CheckCircle2, en_sala: AlertCircle, pendiente: Circle };
const ESTADO_COLORS: Record<string, string> = { confirmada: "text-emerald-500", en_sala: "text-amber-500", pendiente: "text-slate-400" };
const ESTADO_LABELS: Record<string, string> = { confirmada: "Confirmada", en_sala: "En Sala", pendiente: "Pendiente" };
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="w-4 h-4 text-primary/60" />
            <span className="font-serif text-sm md:text-base font-semibold text-foreground">Agenda Clínica</span>
          </div>
          <button className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Cita</span>
          </button>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
        <div className="fade-up mb-5 md:mb-6">
          <p className="label-elegant mb-1.5">Programación</p>
          <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground">Agenda Clínica</h2>
          <div className="gold-rule mt-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">

          {/* ── Panel izquierdo (calendario + info) ────────────── */}
          <div className="space-y-4 md:space-y-5">

            {/* Mini calendario */}
            <div className="card-premium p-4 md:p-5 fade-up stagger-1">
              <div className="flex items-center justify-between mb-4">
                <p className="font-serif font-semibold text-base text-foreground capitalize">
                  {format(selectedDate, "MMMM yyyy", { locale: es })}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0.5 mb-2">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="text-center text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {weekDays.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all ${
                        isSelected ? "bg-primary text-white shadow-sm" : isToday ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                      }`}
                    >
                      {format(day, "d")}
                      <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-white/60" : "bg-primary/40"}`} />
                    </button>
                  );
                })}
              </div>

              <div className="gold-rule-solid mt-4" />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-muted/60 rounded-xl p-3 text-center">
                  <p className="font-serif text-2xl font-semibold text-foreground">5</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Citas hoy</p>
                </div>
                <div className="bg-primary/8 rounded-xl p-3 text-center border border-primary/12">
                  <p className="font-serif text-2xl font-semibold text-primary">3</p>
                  <p className="text-xs text-primary/70 font-medium mt-0.5">Confirmadas</p>
                </div>
              </div>
            </div>

            {/* Sede + estados — en fila en móvil, apilados en desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 md:gap-5">
              <div className="card-premium p-4 md:p-5 fade-up stagger-2">
                <p className="label-elegant mb-3">Sede Activa</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/8 border border-secondary/15 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground">San Isidro</p>
                    <p className="text-xs text-muted-foreground truncate">Av. Camino Real 456</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-emerald-700 font-medium">Disponible</span>
                </div>
              </div>

              <div className="card-premium p-4 md:p-5 fade-up stagger-3">
                <p className="label-elegant mb-3">Estados</p>
                <div className="space-y-2">
                  {[
                    { label: "Confirmada",      Icon: CheckCircle2, color: "text-emerald-500" },
                    { label: "En Sala",          Icon: AlertCircle,  color: "text-amber-500" },
                    { label: "Pendiente",        Icon: Circle,       color: "text-slate-400" },
                  ].map(({ label, Icon, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Panel principal — citas ──────────────────────────── */}
          <div className="lg:col-span-2 fade-up stagger-2">
            <div className="card-premium flex flex-col">
              <div className="px-4 md:px-6 py-4 md:py-5 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="label-elegant mb-0.5 capitalize">
                      {format(selectedDate, "EEEE", { locale: es })}
                    </p>
                    <p className="font-serif text-base md:text-lg font-semibold text-foreground capitalize">
                      {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-semibold border border-primary/20 hover:border-primary/40 px-3 py-2 rounded-lg transition-all shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Agendar cita</span>
                  </button>
                </div>
              </div>

              <div className="p-3 md:p-4 space-y-2">
                {CITAS.map((cita, i) => {
                  const EstadoIcon = ESTADO_ICON[cita.estado];
                  return (
                    <div
                      key={i}
                      className={`flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl ${cita.colorBg} border-l-4 ${cita.color} hover:shadow-sm transition-all cursor-pointer`}
                    >
                      {/* Hora */}
                      <div className="w-12 md:w-16 shrink-0 pt-0.5">
                        <p className="text-sm font-bold text-foreground font-mono">{cita.hora}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 hidden sm:block" />{cita.duracion}
                        </p>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white border border-border flex items-center justify-center text-primary font-bold text-xs shadow-sm shrink-0">
                              {cita.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{cita.nombre}</p>
                              <p className="text-xs text-muted-foreground truncate">{cita.tratamiento}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <EstadoIcon className={`w-3.5 h-3.5 ${ESTADO_COLORS[cita.estado]}`} />
                            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                              {ESTADO_LABELS[cita.estado]}
                            </span>
                          </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">{cita.hora}</span>
                          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/40 rounded-full"
                              style={{ width: cita.estado === "confirmada" ? "100%" : cita.estado === "en_sala" ? "60%" : "0%" }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">{cita.horaFin}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 md:px-6 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{CITAS.length}</span> citas · San Isidro
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /><span>09:00 — 18:00 hrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
