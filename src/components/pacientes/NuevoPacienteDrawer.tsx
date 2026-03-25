"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, User, Phone, MapPin, Stethoscope, ShieldCheck, Loader2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { pacienteSchema, type PacienteFormData } from "@/lib/schemas/paciente.schema";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SECCIONES = [
  { id: "personal", label: "Datos Personales", icon: User },
  { id: "contacto", label: "Contacto", icon: Phone },
  { id: "ubicacion", label: "Ubicación", icon: MapPin },
  { id: "medico", label: "Antecedentes Médicos", icon: Stethoscope },
  { id: "consentimiento", label: "Consentimiento", icon: ShieldCheck },
];

function generateNumeroHistoria() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `HC-${year}-${rand}`;
}

function Field({
  label, error, required, children,
}: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-accent/70 uppercase tracking-wider flex items-center gap-1">
        {label}
        {required && <span className="text-primary">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function NuevoPacienteDrawer({ open, onClose, onSuccess }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: { ciudad: "Lima", consentimiento_datos: false },
  });

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function onSubmit(data: PacienteFormData) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) { toast.error("Sin sesión activa"); return; }

    const alergias = data.alergias_texto
      ? data.alergias_texto.split(",").map((a) => a.trim()).filter(Boolean)
      : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("pacientes") as any).insert({
      numero_historia: generateNumeroHistoria(),
      nombres: data.nombres,
      apellidos: data.apellidos,
      dni: data.dni,
      email: data.email || null,
      telefono: data.telefono,
      telefono_alt: data.telefono_alt || null,
      fecha_nacimiento: data.fecha_nacimiento,
      sexo: data.sexo || null,
      direccion: data.direccion || null,
      distrito: data.distrito || null,
      ciudad: data.ciudad || "Lima",
      ocupacion: data.ocupacion || null,
      grupo_sanguineo: data.grupo_sanguineo || null,
      alergias,
      antecedentes_medicos: data.antecedentes_medicos || null,
      medicamentos_actuales: data.medicamentos_actuales || null,
      consentimiento_datos: data.consentimiento_datos,
      consentimiento_fecha: new Date().toISOString(),
      estado: "activo",
      creado_por: user.id,
    });

    if (error) {
      if (error.message.includes("unique") || error.message.includes("dni")) {
        toast.error("Ya existe un paciente con ese DNI");
      } else {
        toast.error("Error al registrar paciente: " + error.message);
      }
      return;
    }

    toast.success(`Paciente ${data.nombres} ${data.apellidos} registrado correctamente`);
    reset();
    onSuccess();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-2xl h-full bg-background shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-background shrink-0">
          <div>
            <p className="label-elegant mb-1">Directorio Médico</p>
            <h2 className="font-serif text-xl font-semibold text-foreground">
              Nuevo Paciente
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Índice de secciones */}
        <div className="flex items-center gap-1 px-8 py-3 border-b border-border bg-muted/30 overflow-x-auto shrink-0">
          {SECCIONES.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center gap-1 shrink-0">
                <a href={`#seccion-${s.id}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-background text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </a>
                {i < SECCIONES.length - 1 && <ChevronRight className="w-3 h-3 text-border shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Formulario scrolleable */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 space-y-8">

            {/* ── DATOS PERSONALES ── */}
            <section id="seccion-personal">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Datos Personales</h3>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nombres" required error={errors.nombres?.message}>
                  <input {...register("nombres")} placeholder="María" className="input-premium" />
                </Field>
                <Field label="Apellidos" required error={errors.apellidos?.message}>
                  <input {...register("apellidos")} placeholder="González" className="input-premium" />
                </Field>
                <Field label="DNI / Documento" required error={errors.dni?.message}>
                  <input {...register("dni")} placeholder="45871236" maxLength={12} className="input-premium font-mono" />
                </Field>
                <Field label="Fecha de Nacimiento" required error={errors.fecha_nacimiento?.message}>
                  <input type="date" {...register("fecha_nacimiento")} className="input-premium" />
                </Field>
                <Field label="Sexo" error={errors.sexo?.message}>
                  <select {...register("sexo")} className="input-premium bg-white">
                    <option value="">Seleccionar...</option>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                    <option value="otro">Otro</option>
                  </select>
                </Field>
                <Field label="Ocupación" error={errors.ocupacion?.message}>
                  <input {...register("ocupacion")} placeholder="Empresaria" className="input-premium" />
                </Field>
              </div>
            </section>

            {/* ── CONTACTO ── */}
            <section id="seccion-contacto">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Contacto</h3>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Teléfono Principal" required error={errors.telefono?.message}>
                  <input {...register("telefono")} placeholder="+51 987 654 321" className="input-premium" />
                </Field>
                <Field label="Teléfono Alternativo" error={errors.telefono_alt?.message}>
                  <input {...register("telefono_alt")} placeholder="+51 912 345 678" className="input-premium" />
                </Field>
                <div className="col-span-2">
                  <Field label="Correo Electrónico" error={errors.email?.message}>
                    <input type="email" {...register("email")} placeholder="paciente@email.com" className="input-premium" />
                  </Field>
                </div>
              </div>
            </section>

            {/* ── UBICACIÓN ── */}
            <section id="seccion-ubicacion">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Ubicación</h3>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Dirección" error={errors.direccion?.message}>
                    <input {...register("direccion")} placeholder="Av. Javier Prado 1234" className="input-premium" />
                  </Field>
                </div>
                <Field label="Distrito" error={errors.distrito?.message}>
                  <input {...register("distrito")} placeholder="Miraflores" className="input-premium" />
                </Field>
                <Field label="Ciudad" error={errors.ciudad?.message}>
                  <input {...register("ciudad")} placeholder="Lima" className="input-premium" />
                </Field>
              </div>
            </section>

            {/* ── ANTECEDENTES MÉDICOS ── */}
            <section id="seccion-medico">
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Antecedentes Médicos</h3>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Grupo Sanguíneo" error={errors.grupo_sanguineo?.message}>
                  <select {...register("grupo_sanguineo")} className="input-premium bg-white">
                    <option value="">Seleccionar...</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Alergias" error={errors.alergias_texto?.message}>
                  <input {...register("alergias_texto")} placeholder="penicilina, ibuprofeno..." className="input-premium" />
                  <p className="text-xs text-muted-foreground mt-1">Separar con comas</p>
                </Field>
                <div className="col-span-2">
                  <Field label="Antecedentes Médicos" error={errors.antecedentes_medicos?.message}>
                    <textarea
                      {...register("antecedentes_medicos")}
                      rows={3}
                      placeholder="Hipertensión, diabetes, cirugías previas..."
                      className="input-premium resize-none"
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Medicamentos Actuales" error={errors.medicamentos_actuales?.message}>
                    <textarea
                      {...register("medicamentos_actuales")}
                      rows={2}
                      placeholder="Losartán 50mg, metformina 850mg..."
                      className="input-premium resize-none"
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* ── CONSENTIMIENTO ── */}
            <section id="seccion-consentimiento">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Consentimiento de Datos</h3>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("consentimiento_datos")}
                    className="mt-0.5 w-4 h-4 rounded accent-primary shrink-0"
                  />
                  <span className="text-sm text-foreground leading-relaxed">
                    El paciente autoriza el tratamiento de sus datos personales y médicos de conformidad con la{" "}
                    <strong>Ley N° 29733</strong> — Ley de Protección de Datos Personales del Perú. Los datos serán utilizados exclusivamente para la prestación de servicios médicos y no serán compartidos con terceros sin consentimiento explícito.
                  </span>
                </label>
                {errors.consentimiento_datos && (
                  <p className="text-xs text-red-500 mt-2 ml-7">{errors.consentimiento_datos.message}</p>
                )}
              </div>
            </section>

          </div>
        </form>

        {/* Footer con acciones */}
        <div className="px-8 py-5 border-t border-border bg-background shrink-0 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="nuevo-paciente-form"
            disabled={isSubmitting}
            onClick={handleSubmit(onSubmit)}
            className="btn-primary min-w-40"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Registrando...</>
            ) : (
              <><ShieldCheck className="w-4 h-4" />Registrar Paciente</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
