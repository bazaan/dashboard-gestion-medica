"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, User, Phone, MapPin, Stethoscope, Camera,
  CalendarDays, BadgeCheck, Mail, ChevronRight,
} from "lucide-react";
import { FotosTimeline } from "@/components/pacientes/FotosTimeline";
import { HistoriaClinicaTab } from "@/components/pacientes/HistoriaClinicaTab";

// Datos demo — en producción vendrán de Supabase por params.id
const DEMO_PACIENTE = {
  id: "demo-id",
  numero_historia: "HC-2025-00001",
  nombres: "María",
  apellidos: "González Paredes",
  dni: "45871236",
  email: "maria.gonzalez@email.com",
  telefono: "+51 987 654 321",
  telefono_alt: "+51 912 345 678",
  fecha_nacimiento: "1985-04-12",
  sexo: "F",
  direccion: "Av. Javier Prado Este 1234",
  distrito: "Miraflores",
  ciudad: "Lima",
  ocupacion: "Empresaria",
  grupo_sanguineo: "A+",
  alergias: ["Penicilina"],
  antecedentes_medicos: "Hipertensión controlada",
  medicamentos_actuales: "Losartán 50mg",
  estado: "vip",
  sesiones: 8,
  ultimo_tratamiento: "Hilos Delta Lifting®",
  created_at: "2024-01-15",
};

const TABS = [
  { id: "info", label: "Información", icon: User },
  { id: "fotos", label: "Fotos & Evolución", icon: Camera },
  { id: "historia", label: "Historia Clínica", icon: Stethoscope },
  { id: "citas", label: "Citas", icon: CalendarDays },
];

const ESTADO_CONFIG: Record<string, { label: string; class: string }> = {
  vip: { label: "VIP", class: "bg-primary/10 text-primary border-primary/20" },
  activo: { label: "Activo", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  inactivo: { label: "Inactivo", class: "bg-slate-50 text-slate-500 border-slate-200" },
};

function calcularEdad(fechaNacimiento: string) {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function PacientePerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("fotos");

  // En producción: fetchear paciente por id desde Supabase
  const p = DEMO_PACIENTE;
  const estadoConfig = ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG.activo;
  const edad = calcularEdad(p.fecha_nacimiento);
  const initials = `${p.nombres[0]}${p.apellidos[0]}`;

  return (
    <div className="min-h-full bg-background">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-3">
            <Link href="/pacientes" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/pacientes" className="hover:text-foreground transition-colors">Pacientes</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-foreground font-medium">{p.nombres} {p.apellidos}</span>
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${estadoConfig.class}`}>
            {estadoConfig.label}
          </span>
        </div>
      </header>

      <div className="px-4 md:px-8 py-5 md:py-8 max-w-7xl mx-auto">

        {/* Profile card */}
        <div className="card-premium card-gold-top mb-6 fade-up">
          <div className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border-2 border-primary/25 flex items-center justify-center text-primary font-bold text-xl font-serif shrink-0 shadow-sm">
              {initials}
            </div>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="font-serif text-2xl font-semibold text-foreground">
                    {p.nombres} {p.apellidos}
                  </h1>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-sm text-muted-foreground">{edad} años</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-sm text-muted-foreground">DNI: <span className="font-mono font-medium text-foreground">{p.dni}</span></span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                      {p.numero_historia}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <a href={`tel:${p.telefono}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <Phone className="w-3.5 h-3.5" />{p.telefono}
                    </a>
                    {p.email && (
                      <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <Mail className="w-3.5 h-3.5" />{p.email}
                      </a>
                    )}
                    {p.distrito && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />{p.distrito}, {p.ciudad}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats rápidos */}
                <div className="flex items-center gap-4">
                  <div className="text-center px-4 py-2 bg-muted/60 rounded-xl border border-border">
                    <p className="font-serif text-xl font-semibold text-foreground">{p.sesiones}</p>
                    <p className="text-xs text-muted-foreground font-medium">Sesiones</p>
                  </div>
                  <div className="text-center px-4 py-2 bg-primary/8 rounded-xl border border-primary/15">
                    <p className="font-serif text-xl font-semibold text-primary">8</p>
                    <p className="text-xs text-primary/70 font-medium">Fotos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-border px-6 flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido del tab */}
        <div className="fade-up stagger-1">

          {/* TAB: INFORMACIÓN */}
          {activeTab === "info" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card-premium p-6">
                <p className="label-elegant mb-4">Datos Personales</p>
                <InfoRow label="Nombres completos" value={`${p.nombres} ${p.apellidos}`} icon={User} />
                <InfoRow label="DNI" value={p.dni} />
                <InfoRow label="Fecha de nacimiento" value={`${new Date(p.fecha_nacimiento).toLocaleDateString("es-PE")} (${edad} años)`} />
                <InfoRow label="Sexo" value={p.sexo === "F" ? "Femenino" : p.sexo === "M" ? "Masculino" : "Otro"} />
                <InfoRow label="Ocupación" value={p.ocupacion} />
              </div>
              <div className="card-premium p-6">
                <p className="label-elegant mb-4">Contacto & Ubicación</p>
                <InfoRow label="Teléfono" value={p.telefono} icon={Phone} />
                <InfoRow label="Teléfono Alt." value={p.telefono_alt} icon={Phone} />
                <InfoRow label="Email" value={p.email} icon={Mail} />
                <InfoRow label="Dirección" value={p.direccion} icon={MapPin} />
                <InfoRow label="Distrito" value={`${p.distrito}, ${p.ciudad}`} />
              </div>
              <div className="card-premium p-6">
                <p className="label-elegant mb-4">Antecedentes Médicos</p>
                <InfoRow label="Grupo sanguíneo" value={p.grupo_sanguineo} icon={Stethoscope} />
                <InfoRow label="Alergias" value={p.alergias.join(", ") || "Ninguna"} />
                <InfoRow label="Antecedentes" value={p.antecedentes_medicos} />
                <InfoRow label="Medicamentos" value={p.medicamentos_actuales} />
              </div>
            </div>
          )}

          {/* TAB: FOTOS */}
          {activeTab === "fotos" && (
            <FotosTimeline pacienteId={id} pacienteNombre={`${p.nombres} ${p.apellidos}`} />
          )}

          {/* TAB: HISTORIA CLÍNICA */}
          {activeTab === "historia" && (
            <HistoriaClinicaTab
              pacienteId={id}
              pacienteNombre={`${p.nombres} ${p.apellidos}`}
            />
          )}

          {/* TAB: CITAS */}
          {activeTab === "citas" && (
            <div className="card-premium p-16 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/8 border border-primary/15 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-7 h-7 text-primary/40" />
              </div>
              <h4 className="font-serif text-lg font-semibold text-foreground mb-2">Historial de Citas</h4>
              <p className="text-sm text-muted-foreground">Se mostrará el historial de citas del paciente — Fase 3 del roadmap.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
