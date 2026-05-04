"use client";

import { useState } from "react";
import {
  Settings, Users, Shield, Bell, Clock, Building2,
  ChevronDown, ChevronUp, Edit2, Loader2, CheckCircle2,
  XCircle, UserCheck, UserX, Phone, Mail, Globe,
  AlertTriangle, FileText, Eye, EyeOff,
} from "lucide-react";
import { useUsuarios, useActualizarUsuario, useDesactivarUsuario, useAuditLog } from "@/lib/hooks/useConfiguracion";
import type { Profile, UserRole } from "@/types/database.types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  doctor: "Médico Tratante",
  recepcion: "Recepción",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  doctor: "bg-blue-50 text-blue-700 border-blue-200",
  recepcion: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// ── Sección colapsable ──────────────────────────────────────────
function Section({
  title, subtitle, icon: Icon, children, defaultOpen = true,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-premium overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="border-t border-border/60">{children}</div>}
    </div>
  );
}

// ── 1. Gestión de Usuarios ────────────────────────────────────
function UsuariosSection() {
  const { data: usuarios = [], isLoading } = useUsuarios();
  const actualizar = useActualizarUsuario();
  const toggleActivo = useDesactivarUsuario();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("recepcion");

  function startEdit(u: Profile) {
    setEditandoId(u.id);
    setEditRole(u.role);
  }

  function cancelEdit() {
    setEditandoId(null);
  }

  async function saveRole(id: string) {
    await actualizar.mutateAsync({ id, updates: { role: editRole } });
    setEditandoId(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm">Cargando usuarios…</span>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[1fr_120px_100px_80px] gap-3 px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Usuario</span>
        <span>Rol</span>
        <span>Estado</span>
        <span className="text-right">Acciones</span>
      </div>

      {usuarios.map((u) => (
        <div key={u.id} className={`flex flex-col sm:grid sm:grid-cols-[1fr_120px_100px_80px] gap-2 sm:gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors items-start sm:items-center ${!u.is_active ? "opacity-50" : ""}`}>
          {/* Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {u.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
              {u.phone && (
                <p className="text-[11px] text-muted-foreground truncate">{u.phone}</p>
              )}
            </div>
          </div>

          {/* Rol */}
          <div>
            {editandoId === u.id ? (
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="input-premium text-xs py-1.5 px-2"
              >
                <option value="admin">Administrador</option>
                <option value="doctor">Médico Tratante</option>
                <option value="recepcion">Recepción</option>
              </select>
            ) : (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ROLE_COLORS[u.role]}`}>
                {ROLE_LABELS[u.role]}
              </span>
            )}
          </div>

          {/* Estado */}
          <div>
            <button
              onClick={() => toggleActivo.mutate({ id: u.id, is_active: !u.is_active })}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                u.is_active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  : "bg-red-50 text-red-600 border-red-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
              }`}
              title={u.is_active ? "Click para desactivar" : "Click para activar"}
            >
              {u.is_active ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
              {u.is_active ? "Activo" : "Inactivo"}
            </button>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1 sm:justify-end">
            {editandoId === u.id ? (
              <>
                <button
                  onClick={() => saveRole(u.id)}
                  disabled={actualizar.isPending}
                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all"
                  title="Guardar"
                >
                  {actualizar.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all" title="Cancelar">
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all" title="Cambiar rol">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}

      {usuarios.length === 0 && (
        <div className="py-10 text-center text-sm text-muted-foreground">No hay usuarios registrados</div>
      )}
    </div>
  );
}

// ── 2. Datos de la Clínica ─────────────────────────────────────
function ClinicaSection() {
  return (
    <div className="px-5 py-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Nombre de la Clínica</label>
          <div className="input-premium bg-muted/30 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            <span className="text-sm">Clínica Dra. Dennisse Arroyo</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Teléfono WhatsApp</label>
          <div className="input-premium bg-muted/30 flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            <span className="text-sm">+51 936 196 001</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Sitio Web</label>
          <div className="input-premium bg-muted/30 flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            <span className="text-sm">dradennissearroyo.com</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</label>
          <div className="input-premium bg-muted/30 flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            <span className="text-sm">contacto@dradennissearroyo.com</span>
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Horario de Atención</label>
        <div className="input-premium bg-muted/30 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          <span className="text-sm">Lunes a Sábado · 9:00 AM – 7:00 PM</span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Para modificar estos datos, contacta al administrador del sistema.
      </p>
    </div>
  );
}

// ── 3. Recordatorios WhatsApp ──────────────────────────────────
function RecordatoriosSection() {
  const templates = [
    { name: "renovacion_final", tipo: "30 días antes", estado: "Activa", category: "MARKETING" },
    { name: "renovacion_recordatorio_7d", tipo: "7 días antes", estado: "Activa", category: "MARKETING" },
    { name: "renovacion_vencimiento", tipo: "Día del vencimiento", estado: "Activa", category: "MARKETING" },
  ];

  return (
    <div className="px-5 py-5 space-y-5">
      {/* Estado del servicio */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Servicio de Recordatorios</p>
          <p className="text-xs text-muted-foreground">Cron diario a las 9:00 AM (hora Lima) · Railway</p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
          Configurado
        </span>
      </div>

      {/* Templates */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Plantillas WhatsApp</p>
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.name} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/20 transition-colors">
              <Bell className="w-4 h-4 text-primary/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t.tipo}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{t.name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  {t.category}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {t.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flujo */}
      <div className="p-3.5 rounded-xl bg-muted/30 border border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Flujo Automático</p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded bg-white border border-border font-medium">Consulta registrada</span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-white border border-border font-medium">Trigger SQL</span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-white border border-border font-medium">3 recordatorios</span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-white border border-border font-medium">Cron 9AM</span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-emerald-50 border border-emerald-200 font-medium text-emerald-700">WhatsApp</span>
        </div>
      </div>
    </div>
  );
}

// ── 4. Permisos de Acceso ──────────────────────────────────────
function PermisosSection() {
  return (
    <div className="px-5 py-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Acceso a Expedientes</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Recepción requiere aprobación de la doctora para abrir el expediente clínico de cada paciente.
          </p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5" /> Activo
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Duración del Permiso</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Los permisos aprobados expiran a la medianoche del mismo día. Al día siguiente, se requiere nueva solicitud.
          </p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-2.5 h-2.5" /> Hasta medianoche
          </span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Notificaciones en tiempo real</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Las solicitudes de acceso aparecen instantáneamente en el sidebar de la doctora con un badge amarillo parpadeante. La respuesta se refleja al instante en la pantalla de recepción via Supabase Realtime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 5. Log de Auditoría ────────────────────────────────────────
function AuditSection() {
  const { data: logs = [], isLoading } = useAuditLog(30);
  const { data: usuarios = [] } = useUsuarios();
  const userMap = new Map(usuarios.map((u) => [u.id, u.full_name]));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm">Cargando registros…</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-10 text-center">
        <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Sin registros de auditoría</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40 max-h-[400px] overflow-y-auto">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              <span className="font-medium">{log.user_id ? (userMap.get(log.user_id) ?? "Usuario") : "Sistema"}</span>
              {" · "}
              <span className="text-muted-foreground">{log.action}</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {log.resource}
              {log.resource_id && <span className="font-mono"> #{log.resource_id.slice(0, 8)}</span>}
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
            {format(new Date(log.created_at), "dd MMM HH:mm", { locale: es })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function ConfiguracionPage() {
  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2.5 px-4 md:px-8 h-14 md:h-16">
          <Settings className="w-4 h-4 text-primary/60" />
          <span className="font-serif text-sm md:text-base font-semibold text-foreground">
            Configuración
          </span>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto space-y-4">
        {/* Título */}
        <div className="fade-up">
          <p className="label-elegant mb-1.5">Administración</p>
          <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground">
            Configuración del Sistema
          </h2>
          <div className="gold-rule mt-4" />
        </div>

        {/* Secciones */}
        <div className="space-y-3 fade-up stagger-1">
          <Section title="Gestión de Usuarios" subtitle="Roles, estados y permisos del equipo" icon={Users}>
            <UsuariosSection />
          </Section>

          <Section title="Datos de la Clínica" subtitle="Información de contacto y horarios" icon={Building2} defaultOpen={false}>
            <ClinicaSection />
          </Section>

          <Section title="Recordatorios WhatsApp" subtitle="Plantillas, servicio y flujo automático" icon={Bell} defaultOpen={false}>
            <RecordatoriosSection />
          </Section>

          <Section title="Permisos de Acceso" subtitle="Control de acceso a expedientes clínicos" icon={Shield} defaultOpen={false}>
            <PermisosSection />
          </Section>

          <Section title="Log de Auditoría" subtitle="Últimos 30 registros de actividad" icon={FileText} defaultOpen={false}>
            <AuditSection />
          </Section>
        </div>
      </div>
    </div>
  );
}
