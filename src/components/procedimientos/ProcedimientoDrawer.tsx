"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X, Syringe, Loader2, Clock, DollarSign,
  Infinity, RefreshCw, CalendarClock,
} from "lucide-react";
import { CATEGORIA_LABELS, type TratamientoCategoria, type Tratamiento } from "@/types/database.types";
import {
  useCrearProcedimiento, useEditarProcedimiento,
  type ProcedimientoPayload,
} from "@/lib/hooks/useProcedimientos";

const CATEGORIAS = Object.entries(CATEGORIA_LABELS) as [TratamientoCategoria, string][];

// Todos los campos numéricos como string → conversión en onSubmit
const schema = z.object({
  nombre:                     z.string().min(2, "Mínimo 2 caracteres"),
  categoria:                  z.string().min(1, "Selecciona una categoría"),
  duracion_minutos:           z.string().min(1, "Requerido"),
  precio_base:                z.string().optional(),
  vigencia_tipo:              z.enum(["permanente", "fija", "recurrente"]),
  duracion_vigencia_meses:    z.string().optional(),
  intervalo_dias:             z.string().optional(),
  sesiones_por_ciclo:         z.string().optional(),
  requiere_evaluacion_previa: z.boolean(),
  descripcion:                z.string().optional(),
  is_active:                  z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  editando?: Tratamiento | null;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inferVigenciaTipo(t: Tratamiento): "permanente" | "fija" | "recurrente" {
  if (t.es_permanente) return "permanente";
  if (t.intervalo_recordatorio_dias) return "recurrente";
  return "fija";
}

export function ProcedimientoDrawer({ open, onClose, editando }: Props) {
  const crear  = useCrearProcedimiento();
  const editar = useEditarProcedimiento();
  const isPending = crear.isPending || editar.isPending;

  const {
    register, handleSubmit, watch, reset, setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      vigencia_tipo:   "fija",
      sesiones_por_ciclo: "1",
      duracion_minutos: "45",
      is_active: true,
      requiere_evaluacion_previa: false,
    },
  });

  const vigenciaTipo = watch("vigencia_tipo");

  // Pre-llenar al editar
  useEffect(() => {
    if (editando) {
      reset({
        nombre:                     editando.nombre,
        categoria:                  editando.categoria,
        duracion_minutos:           String(editando.duracion_minutos),
        precio_base:                editando.precio_base?.toString() ?? "",
        vigencia_tipo:              inferVigenciaTipo(editando),
        duracion_vigencia_meses:    editando.duracion_vigencia_meses ? String(editando.duracion_vigencia_meses) : "",
        intervalo_dias:             editando.intervalo_recordatorio_dias ? String(editando.intervalo_recordatorio_dias) : "",
        sesiones_por_ciclo:         String(editando.sesiones_por_ciclo ?? 1),
        requiere_evaluacion_previa: editando.requiere_evaluacion_previa,
        descripcion:                editando.descripcion ?? "",
        is_active:                  editando.is_active,
      });
    } else {
      reset({
        vigencia_tipo:   "fija",
        sesiones_por_ciclo: "1",
        duracion_minutos:   "45",
        is_active:          true,
        requiere_evaluacion_previa: false,
      });
    }
  }, [editando, reset, open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);

  async function onSubmit(data: FormData) {
    const payload: ProcedimientoPayload = {
      nombre:                      data.nombre,
      categoria:                   data.categoria,
      duracion_minutos:            parseInt(data.duracion_minutos) || 45,
      precio_base:                 data.precio_base ? parseFloat(data.precio_base) : null,
      vigencia_tipo:               data.vigencia_tipo,
      duracion_vigencia_meses:     data.vigencia_tipo === "fija"       ? (parseInt(data.duracion_vigencia_meses ?? "") || null) : null,
      intervalo_recordatorio_dias: data.vigencia_tipo === "recurrente" ? (parseInt(data.intervalo_dias ?? "")           || null) : null,
      sesiones_por_ciclo:          parseInt(data.sesiones_por_ciclo ?? "1") || 1,
      es_permanente:               data.vigencia_tipo === "permanente",
      requiere_evaluacion_previa:  data.requiere_evaluacion_previa,
      descripcion:                 data.descripcion ?? "",
      is_active:                   data.is_active,
    };

    if (editando) {
      await editar.mutateAsync({ id: editando.id, payload });
    } else {
      await crear.mutateAsync(payload);
    }
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-background shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="label-elegant mb-0.5">{editando ? "Editar" : "Nuevo"} Procedimiento</p>
            <h3 className="font-serif text-lg font-semibold text-foreground">
              {editando ? editando.nombre : "Agregar al catálogo"}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Nombre */}
          <Field label="Nombre del procedimiento *" error={errors.nombre?.message}>
            <input {...register("nombre")} placeholder="Ej. Hilos Delta Lifting®"
              className="input-premium" />
          </Field>

          {/* Categoría */}
          <Field label="Categoría *" error={errors.categoria?.message}>
            <select {...register("categoria")} className="input-premium">
              <option value="">Seleccionar…</option>
              {CATEGORIAS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </Field>

          {/* Duración sesión + Precio */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duración (min) *" error={errors.duracion_minutos?.message}>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="number" {...register("duracion_minutos")} min={5}
                  className="input-premium pl-9" placeholder="45" />
              </div>
            </Field>
            <Field label="Precio base (S/.)">
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="number" {...register("precio_base")} min={0} step={0.01}
                  className="input-premium pl-9" placeholder="Opcional" />
              </div>
            </Field>
          </div>

          {/* Vigencia */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Tipo de Vigencia *
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {([
                { val: "permanente", label: "Permanente",  icon: Infinity,     desc: "Sin vencimiento" },
                { val: "fija",       label: "Duración fija",icon: CalendarClock,desc: "X meses"         },
                { val: "recurrente", label: "Recurrente",  icon: RefreshCw,    desc: "Cada X días"     },
              ] as const).map(({ val, label, icon: Icon, desc }) => {
                const active = vigenciaTipo === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setValue("vigencia_tipo", val)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                      active
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border hover:border-primary/25 text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-[10px] opacity-70">{desc}</span>
                  </button>
                );
              })}
            </div>

            {vigenciaTipo === "fija" && (
              <Field label="Duración en meses" error={errors.duracion_vigencia_meses?.message}>
                <input type="number" {...register("duracion_vigencia_meses")} min={1}
                  className="input-premium" placeholder="Ej. 6, 12, 24…" />
              </Field>
            )}

            {vigenciaTipo === "recurrente" && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Intervalo (días)" error={errors.intervalo_dias?.message}>
                  <input type="number" {...register("intervalo_dias")} min={1}
                    className="input-premium" placeholder="Ej. 120 (=4 meses)" />
                </Field>
                <Field label="Sesiones por ciclo">
                  <input type="number" {...register("sesiones_por_ciclo")} min={1}
                    className="input-premium" placeholder="Ej. 3" />
                </Field>
              </div>
            )}
          </div>

          {/* Descripción */}
          <Field label="Descripción">
            <textarea {...register("descripcion")} rows={2}
              className="input-premium resize-none"
              placeholder="Descripción breve del procedimiento…" />
          </Field>

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            {[
              { key: "requiere_evaluacion_previa" as const, label: "Requiere evaluación previa" },
              { key: "is_active" as const,                  label: "Procedimiento activo (visible en formularios)" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" {...register(key)} className="sr-only peer" />
                  <div className="w-10 h-5 bg-border rounded-full peer-checked:bg-primary transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </div>
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
            className="flex-1 btn-primary py-2.5 justify-center disabled:opacity-60"
          >
            {isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
              : <><Syringe className="w-4 h-4" /> {editando ? "Guardar cambios" : "Crear procedimiento"}</>}
          </button>
        </div>
      </div>
    </>
  );
}
