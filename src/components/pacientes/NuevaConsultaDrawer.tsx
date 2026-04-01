"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X, Syringe, Loader2, Clock, Calendar,
  Check, ChevronDown, ChevronUp, ClipboardList,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { consultaSchema, type ConsultaFormData } from "@/lib/schemas/consulta.schema";
import { useCrearConsulta, useTratamientosCatalogo } from "@/lib/hooks/useConsultas";
import { CATEGORIA_LABELS, type TratamientoCategoria } from "@/types/database.types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pacienteId: string;
  pacienteNombre: string;
  pacienteSexo: string | null;
  historiaId: string;
}

export function NuevaConsultaDrawer({
  open, onClose, onSuccess,
  pacienteId, pacienteNombre, pacienteSexo, historiaId,
}: Props) {
  const [selectedTratamientos, setSelectedTratamientos] = useState<string[]>([]);
  const [doctorId, setDoctorId]   = useState("");
  const [clinicaOpen, setClinicaOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  const crearConsulta = useCrearConsulta();
  const { data: tratamientos = [] } = useTratamientosCatalogo();

  const {
    register, handleSubmit, reset, setValue,
    formState: { errors },
  } = useForm<ConsultaFormData>({
    resolver: zodResolver(consultaSchema),
    defaultValues: {
      fecha_atencion:  new Date().toISOString().split("T")[0],
      hora_atencion:   new Date().toTimeString().slice(0, 5),
      tratamiento_ids: [],
    },
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setDoctorId(data.user.id);
    });
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggle = (id: string) => {
    setSelectedTratamientos((prev) => {
      const next = prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id];
      setValue("tratamiento_ids", next, { shouldValidate: true });
      return next;
    });
  };

  // Agrupar y filtrar por búsqueda
  const filtered = catSearch
    ? tratamientos.filter((t) => t.nombre.toLowerCase().includes(catSearch.toLowerCase()))
    : tratamientos;

  const porCategoria = filtered.reduce<Record<string, typeof filtered>>((acc, t) => {
    if (!acc[t.categoria]) acc[t.categoria] = [];
    acc[t.categoria].push(t);
    return acc;
  }, {});

  async function onSubmit(data: ConsultaFormData) {
    if (selectedTratamientos.length === 0) {
      toast.error("Selecciona al menos un procedimiento");
      return;
    }
    const fechaHora = `${data.fecha_atencion}T${data.hora_atencion}:00`;
    const procedimientoResumen = selectedTratamientos
      .map((id) => tratamientos.find((t) => t.id === id)?.nombre)
      .filter(Boolean).join(", ");

    await crearConsulta.mutateAsync({
      historia_id:             historiaId,
      paciente_id:             pacienteId,
      doctor_id:               doctorId,
      fecha_atencion:          fechaHora,
      motivo_consulta:         data.motivo_consulta || "",
      signos_sintomas:         data.signos_sintomas,
      examen_fisico:           data.examen_fisico,
      fur:                     pacienteSexo === "F" ? data.fur : undefined,
      ram:                     data.ram,
      antecedentes:            data.antecedentes,
      examenes_auxiliares:     data.examenes_auxiliares,
      medicacion:              data.medicacion,
      diagnostico:             data.diagnostico,
      procedimiento:           procedimientoResumen,
      observaciones:           data.observaciones,
      recomendaciones:         data.recomendaciones,
      proxima_sesion_sugerida: data.proxima_sesion,
      tratamiento_ids:         selectedTratamientos,
    });

    reset();
    setSelectedTratamientos([]);
    setValue("tratamiento_ids", []);
    setCatSearch("");
    setClinicaOpen(false);
    onSuccess();
    onClose();
  }

  if (!open) return null;

  const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-background shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background shrink-0">
          <div>
            <p className="label-elegant mb-0.5">Nueva Consulta</p>
            <h3 className="font-serif text-lg font-semibold text-foreground">{pacienteNombre}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* Fecha + Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Fecha
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input type="date" {...register("fecha_atencion")} className={`${inputCls} pl-9`} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Hora
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input type="time" {...register("hora_atencion")} className={`${inputCls} pl-9`} />
                </div>
              </div>
            </div>

            {/* ── Procedimientos (sección principal) ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Syringe className="w-3.5 h-3.5 text-primary" />
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Procedimientos realizados <span className="text-red-400">*</span>
                </label>
              </div>

              {/* Chips de seleccionados */}
              {selectedTratamientos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5 p-3 bg-primary/5 rounded-xl border border-primary/15">
                  {selectedTratamientos.map((id) => {
                    const t = tratamientos.find((x) => x.id === id);
                    if (!t) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-white rounded-full text-xs font-medium">
                        {t.nombre}
                        <button type="button" onClick={() => toggle(id)} className="hover:opacity-70">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Búsqueda */}
              <input
                type="text"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Buscar procedimiento…"
                className={`${inputCls} mb-3`}
              />

              {/* Lista agrupada */}
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/60 max-h-64 overflow-y-auto">
                {Object.entries(porCategoria).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="px-3.5 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/40 sticky top-0">
                      {CATEGORIA_LABELS[cat as TratamientoCategoria] ?? cat}
                    </p>
                    {items.map((t) => {
                      const selected = selectedTratamientos.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggle(t.id)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors ${
                            selected ? "bg-primary/8" : "hover:bg-muted/40"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            selected ? "bg-primary border-primary" : "border-border"
                          }`}>
                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={`flex-1 font-medium ${selected ? "text-primary" : "text-foreground"}`}>
                            {t.nombre}
                          </span>
                          {/* Badge vigencia */}
                          {t.es_permanente ? (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full shrink-0">∞</span>
                          ) : t.duracion_vigencia_meses ? (
                            <span className="text-[10px] text-primary/70 bg-primary/8 border border-primary/15 px-1.5 py-0.5 rounded-full shrink-0">
                              {t.duracion_vigencia_meses >= 12 ? `${t.duracion_vigencia_meses / 12}a` : `${t.duracion_vigencia_meses}m`}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {Object.keys(porCategoria).length === 0 && (
                  <p className="px-4 py-6 text-sm text-center text-muted-foreground">Sin resultados para &ldquo;{catSearch}&rdquo;</p>
                )}
              </div>
              {errors.tratamiento_ids && (
                <p className="text-xs text-red-500 mt-1.5">{errors.tratamiento_ids.message}</p>
              )}
            </div>

            {/* Notas / Observaciones */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Notas / Observaciones
              </label>
              <textarea {...register("observaciones")} rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Resultado del procedimiento, incidencias, indicaciones post…" />
            </div>

            {/* Próxima sesión */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Próxima sesión sugerida
              </label>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input type="date" {...register("proxima_sesion")} className={`${inputCls} pl-9`} />
              </div>
            </div>

            {/* ── Datos clínicos adicionales (colapsable) ── */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setClinicaOpen((v) => !v)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${clinicaOpen ? "bg-muted/40" : "hover:bg-muted/20"}`}
              >
                <ClipboardList className="w-4 h-4 text-primary/60 shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground">Datos clínicos adicionales</span>
                <span className="text-xs text-muted-foreground mr-1">Motivo, examen, RAM, antecedentes…</span>
                {clinicaOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>

              {clinicaOpen && (
                <div className="px-5 pb-5 pt-3 space-y-4 border-t border-border/60">

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Motivo de consulta
                    </label>
                    <textarea {...register("motivo_consulta")} rows={2}
                      className={`${inputCls} resize-none`}
                      placeholder="¿Por qué acude la paciente hoy?" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Signos y síntomas
                      </label>
                      <textarea {...register("signos_sintomas")} rows={2}
                        className={`${inputCls} resize-none`} placeholder="…" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Examen físico
                      </label>
                      <textarea {...register("examen_fisico")} rows={2}
                        className={`${inputCls} resize-none`} placeholder="Hallazgos…" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Diagnóstico
                      </label>
                      <textarea {...register("diagnostico")} rows={2}
                        className={`${inputCls} resize-none`} placeholder="Diagnóstico clínico…" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        RAM (reacciones adversas)
                      </label>
                      <textarea {...register("ram")} rows={2}
                        className={`${inputCls} resize-none`} placeholder="Alergias conocidas…" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Antecedentes
                      </label>
                      <textarea {...register("antecedentes")} rows={2}
                        className={`${inputCls} resize-none`} placeholder="Médicos, quirúrgicos…" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Medicación actual
                      </label>
                      <textarea {...register("medicacion")} rows={2}
                        className={`${inputCls} resize-none`} placeholder="Medicamentos en uso…" />
                    </div>
                  </div>

                  {pacienteSexo === "F" && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        FUR — Fecha de última regla
                      </label>
                      <input type="date" {...register("fur")} className={inputCls} />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Exámenes auxiliares
                    </label>
                    <textarea {...register("examenes_auxiliares")} rows={2}
                      className={`${inputCls} resize-none`} placeholder="Laboratorio, imágenes…" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      Recomendaciones post-procedimiento
                    </label>
                    <textarea {...register("recomendaciones")} rows={2}
                      className={`${inputCls} resize-none`} placeholder="Cuidados, restricciones…" />
                  </div>

                </div>
              )}
            </div>

          </div>
        </form>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border bg-muted/10 flex gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={crearConsulta.isPending || selectedTratamientos.length === 0}
            className="flex-1 btn-primary py-2.5 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {crearConsulta.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
              : <><ClipboardList className="w-4 h-4" /> Guardar Consulta</>}
          </button>
        </div>
      </div>
    </>
  );
}
