"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, User, Phone, MapPin, Stethoscope, Camera,
  CalendarDays, BadgeCheck, Mail, ChevronRight, Loader2,
  Plus, AlertCircle,
} from "lucide-react";
import { FotosTimeline } from "@/components/pacientes/FotosTimeline";
import { HistoriaClinicaTab } from "@/components/pacientes/HistoriaClinicaTab";
import { NuevaConsultaDrawer } from "@/components/pacientes/NuevaConsultaDrawer";
import { usePaciente, calcularEdad, getInitials } from "@/lib/hooks/usePacientes";
import { useHistoriaClinica } from "@/lib/hooks/useConsultas";

const TABS = [
  { id: "fotos",   label: "Fotos & Evolución",  icon: Camera      },
  { id: "historia",label: "Historia Clínica",    icon: Stethoscope },
  { id: "info",    label: "Información",          icon: User        },
  { id: "citas",   label: "Citas",               icon: CalendarDays},
];

const ESTADO_CONFIG: Record<string, { label: string; class: string }> = {
  vip:      { label: "VIP",      class: "bg-primary/10 text-primary border-primary/20" },
  activo:   { label: "Activo",   class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  inactivo: { label: "Inactivo", class: "bg-slate-50 text-slate-500 border-slate-200" },
};

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
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
  const [activeTab, setActiveTab]         = useState("fotos");
  const [consultaDrawerOpen, setConsultaDrawerOpen] = useState(false);

  const { data: paciente, isLoading, error } = usePaciente(id);
  const { data: historia } = useHistoriaClinica(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Cargando perfil del paciente…</p>
        </div>
      </div>
    );
  }

  if (error || !paciente) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h3 className="font-serif text-lg font-semibold mb-2">Paciente no encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No se pudo cargar el perfil. Verifica que el paciente exista.
          </p>
          <Link href="/pacientes" className="btn-primary text-sm inline-flex">
            <ArrowLeft className="w-4 h-4" /> Volver a Pacientes
          </Link>
        </div>
      </div>
    );
  }

  const estadoConfig = ESTADO_CONFIG[paciente.estado] ?? ESTADO_CONFIG.activo;
  const edad    = calcularEdad(paciente.fecha_nacimiento);
  const initials = getInitials(paciente.nombres, paciente.apellidos);

  return (
    <div className="min-h-full bg-background">

      {/* Drawer nueva consulta */}
      {historia && (
        <NuevaConsultaDrawer
          open={consultaDrawerOpen}
          onClose={() => setConsultaDrawerOpen(false)}
          onSuccess={() => setConsultaDrawerOpen(false)}
          pacienteId={id}
          pacienteNombre={`${paciente.nombres} ${paciente.apellidos}`}
          pacienteSexo={paciente.sexo}
          historiaId={historia.id}
          historia={historia}
        />
      )}

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
              <span className="text-foreground font-medium">{paciente.nombres} {paciente.apellidos}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${estadoConfig.class}`}>
              {estadoConfig.label}
            </span>
            {historia && (
              <button
                onClick={() => setConsultaDrawerOpen(true)}
                className="btn-primary text-xs hidden sm:flex"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva Consulta
              </button>
            )}
          </div>
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
                    {paciente.nombres} {paciente.apellidos}
                  </h1>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-sm text-muted-foreground">{edad} años</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-sm text-muted-foreground">
                      DNI: <span className="font-mono font-medium text-foreground">{paciente.dni}</span>
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                      {paciente.numero_historia}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <a href={`tel:${paciente.telefono}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <Phone className="w-3.5 h-3.5" />{paciente.telefono}
                    </a>
                    {paciente.email && (
                      <a href={`mailto:${paciente.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <Mail className="w-3.5 h-3.5" />{paciente.email}
                      </a>
                    )}
                    {paciente.distrito && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />{paciente.distrito}, {paciente.ciudad}
                      </span>
                    )}
                  </div>
                </div>

                {/* Botón móvil */}
                {historia && (
                  <button
                    onClick={() => setConsultaDrawerOpen(true)}
                    className="btn-primary text-xs sm:hidden"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nueva Consulta
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-border px-4 md:px-6 flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
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

          {/* TAB: FOTOS */}
          {activeTab === "fotos" && (
            <FotosTimeline
              pacienteId={id}
              pacienteNombre={`${paciente.nombres} ${paciente.apellidos}`}
            />
          )}

          {/* TAB: HISTORIA CLÍNICA */}
          {activeTab === "historia" && (
            <HistoriaClinicaTab
              pacienteId={id}
              pacienteNombre={`${paciente.nombres} ${paciente.apellidos}`}
            />
          )}

          {/* TAB: INFORMACIÓN */}
          {activeTab === "info" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card-premium p-6">
                <p className="label-elegant mb-4">Datos Personales</p>
                <InfoRow label="Nombres completos" value={`${paciente.nombres} ${paciente.apellidos}`} icon={User} />
                <InfoRow label="DNI" value={paciente.dni} />
                <InfoRow
                  label="Fecha de nacimiento"
                  value={`${new Date(paciente.fecha_nacimiento).toLocaleDateString("es-PE")} (${edad} años)`}
                />
                <InfoRow
                  label="Sexo"
                  value={paciente.sexo === "F" ? "Femenino" : paciente.sexo === "M" ? "Masculino" : paciente.sexo ? "Otro" : undefined}
                />
                <InfoRow label="Ocupación" value={paciente.ocupacion} />
              </div>
              <div className="card-premium p-6">
                <p className="label-elegant mb-4">Contacto & Ubicación</p>
                <InfoRow label="Teléfono" value={paciente.telefono} icon={Phone} />
                <InfoRow label="Teléfono Alt." value={paciente.telefono_alt} icon={Phone} />
                <InfoRow label="Email" value={paciente.email} icon={Mail} />
                <InfoRow label="Dirección" value={paciente.direccion} icon={MapPin} />
                {(paciente.distrito || paciente.ciudad) && (
                  <InfoRow label="Distrito / Ciudad" value={[paciente.distrito, paciente.ciudad].filter(Boolean).join(", ")} />
                )}
              </div>
              <div className="card-premium p-6">
                <p className="label-elegant mb-4">Antecedentes Médicos</p>
                <InfoRow label="Grupo sanguíneo" value={paciente.grupo_sanguineo} icon={Stethoscope} />
                <InfoRow label="Alergias" value={paciente.alergias?.join(", ") || "Ninguna registrada"} />
                <InfoRow label="Antecedentes" value={paciente.antecedentes_medicos} />
                <InfoRow label="Medicamentos" value={paciente.medicamentos_actuales} />
              </div>
            </div>
          )}

          {/* TAB: CITAS */}
          {activeTab === "citas" && (
            <div className="card-premium p-16 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/8 border border-primary/15 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-7 h-7 text-primary/40" />
              </div>
              <h4 className="font-serif text-lg font-semibold text-foreground mb-2">Historial de Citas</h4>
              <p className="text-sm text-muted-foreground">Próximamente — integración con el módulo de Agenda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
