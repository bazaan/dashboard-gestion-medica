"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText, Plus, Upload, Trash2, X, ChevronDown, ChevronUp,
  Stethoscope, Calendar, Loader2, Lock, File as FileIcon,
  Edit3, Eye, Download, AlertCircle, Syringe, ClipboardList,
  Pill, MapPin as ZonaIcon, MessageSquare, CalendarClock, CheckCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { HistoriaClinica, EvolucionClinica } from "@/types/database.types";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de UI
// ─────────────────────────────────────────────────────────────────────────────
const TIPO_PIEL_LABELS: Record<string, string> = {
  seca: "Seca", grasa: "Grasa", mixta: "Mixta",
  normal: "Normal", sensible: "Sensible",
};

const FITZPATRICK_LABELS: Record<number, string> = {
  1: "I — Siempre se quema, nunca broncea",
  2: "II — Casi siempre se quema, poco broncea",
  3: "III — A veces se quema, broncea moderado",
  4: "IV — Raramente se quema, broncea bien",
  5: "V — Muy raramente se quema, se broncea mucho",
  6: "VI — Nunca se quema, muy oscuro",
};

// ─────────────────────────────────────────────────────────────────────────────
// Hooks de datos
// ─────────────────────────────────────────────────────────────────────────────
function useHistoria(pacienteId: string) {
  return useQuery<HistoriaClinica | null>({
    queryKey: ["historia", pacienteId],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("historias_clinicas")
        .select("*")
        .eq("paciente_id", pacienteId)
        .single();
      if (error?.code === "PGRST116") return null; // not found
      if (error) throw error;
      return data as HistoriaClinica;
    },
    retry: false,
  });
}

function useEvoluciones(historiaId: string | null) {
  return useQuery<EvolucionClinica[]>({
    queryKey: ["evoluciones", historiaId],
    queryFn: async () => {
      if (!historiaId) return [];
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("evoluciones_clinicas")
        .select("*")
        .eq("historia_id", historiaId)
        .order("fecha_atencion", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EvolucionClinica[];
    },
    enabled: !!historiaId,
  });
}

function useDocumentos(pacienteId: string) {
  return useQuery({
    queryKey: ["documentos", pacienteId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("documentos-pacientes")
        .list(pacienteId, { limit: 50, sortBy: { column: "created_at", order: "desc" } });
      if (error) return []; // bucket puede no existir aún
      return data ?? [];
    },
    retry: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Crear Historia Clínica (cuando no existe)
// ─────────────────────────────────────────────────────────────────────────────
function CrearHistoriaCard({ pacienteId, onCreated }: { pacienteId: string; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    motivo: "", antecedentes: "", expectativas: "",
    tipo_piel: "", fototipo: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.motivo) { toast.error("El motivo de consulta es obligatorio"); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("historias_clinicas").insert({
      paciente_id: pacienteId,
      numero: `HC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      motivo_consulta_inicial: form.motivo,
      antecedentes_esteticos: form.antecedentes || null,
      expectativas_paciente: form.expectativas || null,
      tipo_piel: form.tipo_piel || null,
      fototipo_fitzpatrick: form.fototipo ? parseInt(form.fototipo) : null,
      condiciones_piel: [],
      abierta_por: user?.id ?? null,
    });

    setLoading(false);
    if (error) { toast.error("Error al crear historia: " + error.message); return; }
    toast.success("Historia clínica creada correctamente");
    onCreated();
  }

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60";

  return (
    <div className="card-premium p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-primary/8 border border-primary/15 flex items-center justify-center mx-auto mb-4">
          <Stethoscope className="w-7 h-7 text-primary/50" />
        </div>
        <h4 className="font-serif text-xl font-semibold text-foreground mb-1">
          Crear Historia Clínica
        </h4>
        <p className="text-sm text-muted-foreground">
          Registra los datos iniciales del paciente para abrir su historia clínica
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Motivo de consulta inicial <span className="text-red-400">*</span>
          </label>
          <textarea
            rows={3}
            value={form.motivo}
            onChange={(e) => setForm(p => ({ ...p, motivo: e.target.value }))}
            placeholder="¿Por qué acude el paciente? ¿Qué área desea mejorar?"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Tipo de piel
            </label>
            <select
              value={form.tipo_piel}
              onChange={(e) => setForm(p => ({ ...p, tipo_piel: e.target.value }))}
              className={inputClass}
            >
              <option value="">Seleccionar…</option>
              {Object.entries(TIPO_PIEL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Fototipo Fitzpatrick
            </label>
            <select
              value={form.fototipo}
              onChange={(e) => setForm(p => ({ ...p, fototipo: e.target.value }))}
              className={inputClass}
            >
              <option value="">Seleccionar…</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>Tipo {n}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Antecedentes estéticos previos
          </label>
          <textarea
            rows={2}
            value={form.antecedentes}
            onChange={(e) => setForm(p => ({ ...p, antecedentes: e.target.value }))}
            placeholder="Tratamientos previos, cirugías, rellenos, botox…"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Expectativas del paciente
          </label>
          <textarea
            rows={2}
            value={form.expectativas}
            onChange={(e) => setForm(p => ({ ...p, expectativas: e.target.value }))}
            placeholder="¿Qué resultado espera obtener?"
            className={inputClass}
          />
        </div>

        <div className="gold-rule-solid" />

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {loading ? "Creando historia…" : "Abrir Historia Clínica"}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card de Historia Base
// ─────────────────────────────────────────────────────────────────────────────
function HistoriaBaseCard({ historia }: { historia: HistoriaClinica }) {
  return (
    <div className="card-premium overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <ClipboardList className="w-4 h-4 text-primary" />
        <div>
          <p className="label-elegant">Historia Base</p>
          <p className="text-xs text-muted-foreground font-mono">{historia.numero}</p>
        </div>
      </div>

      <div className="p-5 space-y-4 text-sm">
        {historia.motivo_consulta_inicial && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Motivo de consulta inicial
            </p>
            <p className="text-foreground leading-relaxed">{historia.motivo_consulta_inicial}</p>
          </div>
        )}

        {(historia.tipo_piel || historia.fototipo_fitzpatrick) && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            {historia.tipo_piel && (
              <div className="bg-muted/50 rounded-xl p-3 border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tipo de piel</p>
                <p className="font-medium text-foreground">{TIPO_PIEL_LABELS[historia.tipo_piel] ?? historia.tipo_piel}</p>
              </div>
            )}
            {historia.fototipo_fitzpatrick && (
              <div className="bg-muted/50 rounded-xl p-3 border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fototipo</p>
                <p className="font-medium text-foreground">Tipo {historia.fototipo_fitzpatrick}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {FITZPATRICK_LABELS[historia.fototipo_fitzpatrick]}
                </p>
              </div>
            )}
          </div>
        )}

        {historia.antecedentes_esteticos && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Antecedentes estéticos</p>
            <p className="text-foreground leading-relaxed">{historia.antecedentes_esteticos}</p>
          </div>
        )}

        {historia.expectativas_paciente && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Expectativas</p>
            <p className="text-foreground leading-relaxed">{historia.expectativas_paciente}</p>
          </div>
        )}

        {historia.condiciones_piel && historia.condiciones_piel.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Condiciones</p>
            <div className="flex flex-wrap gap-1.5">
              {historia.condiciones_piel.map((c) => (
                <span key={c} className="px-2.5 py-1 bg-primary/8 border border-primary/15 text-primary text-xs rounded-full font-medium">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-1 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground/60">
            Abierta el {format(new Date(historia.created_at), "d MMM yyyy", { locale: es })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer de Nueva Evolución
// ─────────────────────────────────────────────────────────────────────────────
interface NuevaEvolucionDrawerProps {
  open: boolean;
  onClose: () => void;
  historiaId: string;
  pacienteId: string;
}

function NuevaEvolucionDrawer({ open, onClose, historiaId, pacienteId }: NuevaEvolucionDrawerProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    motivo: "",
    examen: "",
    diagnostico: "",
    procedimiento: "",
    productos: "",
    zonas: "",
    observaciones: "",
    recomendaciones: "",
    proxima: "",
  });

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60";

  function reset() {
    setForm({
      fecha: new Date().toISOString().split("T")[0],
      motivo: "", examen: "", diagnostico: "", procedimiento: "",
      productos: "", zonas: "", observaciones: "", recomendaciones: "", proxima: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.motivo || !form.procedimiento) {
      toast.error("Completa el motivo y el procedimiento");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const productosArr = form.productos.split(",").map(s => s.trim()).filter(Boolean);
    const zonasArr = form.zonas.split(",").map(s => s.trim()).filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("evoluciones_clinicas").insert({
      historia_id: historiaId,
      paciente_id: pacienteId,
      doctor_id: user?.id ?? "",
      fecha_atencion: form.fecha,
      motivo_consulta: form.motivo,
      examen_fisico: form.examen || null,
      diagnostico: form.diagnostico || null,
      procedimiento: form.procedimiento,
      productos_usados: productosArr,
      zona_tratada: zonasArr,
      observaciones: form.observaciones || null,
      recomendaciones: form.recomendaciones || null,
      proxima_sesion_sugerida: form.proxima || null,
      is_locked: false,
    });

    setLoading(false);
    if (error) { toast.error("Error al guardar evolución: " + error.message); return; }
    toast.success("Evolución registrada correctamente");
    queryClient.invalidateQueries({ queryKey: ["evoluciones", historiaId] });
    reset();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-background shadow-2xl overflow-y-auto"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-background z-10 flex items-center justify-between px-7 py-5 border-b border-border">
              <div>
                <p className="label-elegant mb-0.5">Nueva Evolución</p>
                <h3 className="font-serif text-xl font-semibold text-foreground">Registro de Sesión</h3>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-7 py-6 space-y-6">

              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Fecha de atención
                </label>
                <input type="date" value={form.fecha}
                  onChange={(e) => setForm(p => ({ ...p, fecha: e.target.value }))}
                  className={inputClass}
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Motivo de consulta <span className="text-red-400">*</span>
                </label>
                <textarea rows={2} value={form.motivo}
                  onChange={(e) => setForm(p => ({ ...p, motivo: e.target.value }))}
                  placeholder="¿Por qué acudió el paciente en esta sesión?"
                  className={inputClass}
                />
              </div>

              {/* Procedimiento */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Procedimiento realizado <span className="text-red-400">*</span>
                </label>
                <textarea rows={3} value={form.procedimiento}
                  onChange={(e) => setForm(p => ({ ...p, procedimiento: e.target.value }))}
                  placeholder="Describe el procedimiento realizado, técnica aplicada, cantidad de hilos/unidades…"
                  className={inputClass}
                />
              </div>

              {/* Zonas y productos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Zona(s) tratada(s)
                  </label>
                  <input type="text" value={form.zonas}
                    onChange={(e) => setForm(p => ({ ...p, zonas: e.target.value }))}
                    placeholder="Frente, mejillas, cuello…"
                    className={inputClass}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Separar con comas</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Productos utilizados
                  </label>
                  <input type="text" value={form.productos}
                    onChange={(e) => setForm(p => ({ ...p, productos: e.target.value }))}
                    placeholder="Lidocaína, Juvederm, Xeomin…"
                    className={inputClass}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Separar con comas</p>
                </div>
              </div>

              {/* Examen y diagnóstico */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Examen físico
                  </label>
                  <textarea rows={2} value={form.examen}
                    onChange={(e) => setForm(p => ({ ...p, examen: e.target.value }))}
                    placeholder="Hallazgos al examen…"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Diagnóstico
                  </label>
                  <textarea rows={2} value={form.diagnostico}
                    onChange={(e) => setForm(p => ({ ...p, diagnostico: e.target.value }))}
                    placeholder="Diagnóstico clínico…"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Observaciones y recomendaciones */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Observaciones
                </label>
                <textarea rows={2} value={form.observaciones}
                  onChange={(e) => setForm(p => ({ ...p, observaciones: e.target.value }))}
                  placeholder="Incidencias, reacciones, notas intraoperatorias…"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Recomendaciones post-procedimiento
                </label>
                <textarea rows={2} value={form.recomendaciones}
                  onChange={(e) => setForm(p => ({ ...p, recomendaciones: e.target.value }))}
                  placeholder="Cuidados, restricciones, medicación…"
                  className={inputClass}
                />
              </div>

              {/* Próxima sesión */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Próxima sesión sugerida
                </label>
                <input type="date" value={form.proxima}
                  onChange={(e) => setForm(p => ({ ...p, proxima: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="gold-rule-solid" />

              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 px-5 py-3 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-all text-sm font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                  {loading ? "Guardando…" : "Guardar Evolución"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card de Evolución
// ─────────────────────────────────────────────────────────────────────────────
function EvolucionCard({ evolucion }: { evolucion: EvolucionClinica }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-premium overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left"
      >
        {/* Timeline dot */}
        <div className="shrink-0 mt-0.5 flex flex-col items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-primary/70 border-2 border-primary/25 shadow-sm" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-serif font-semibold text-foreground leading-tight">
                {format(new Date(evolucion.fecha_atencion), "d 'de' MMMM yyyy", { locale: es })}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {evolucion.motivo_consulta}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {evolucion.is_locked && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                  <Lock className="w-2.5 h-2.5" /> Firmada
                </span>
              )}
              {expanded
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              }
            </div>
          </div>

          {/* Tags de zona */}
          {evolucion.zona_tratada && evolucion.zona_tratada.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {evolucion.zona_tratada.map((z) => (
                <span key={z} className="px-2 py-0.5 bg-primary/8 border border-primary/15 text-primary text-[10px] rounded-full font-semibold">
                  {z}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <div className="gold-rule-solid mb-5" />
              <div className="space-y-4 text-sm">

                <DetailRow icon={Syringe} label="Procedimiento" value={evolucion.procedimiento} />
                {evolucion.examen_fisico && <DetailRow icon={Eye} label="Examen físico" value={evolucion.examen_fisico} />}
                {evolucion.diagnostico && <DetailRow icon={Stethoscope} label="Diagnóstico" value={evolucion.diagnostico} />}

                {evolucion.productos_usados && evolucion.productos_usados.length > 0 && (
                  <div className="flex gap-3">
                    <Pill className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Productos utilizados</p>
                      <div className="flex flex-wrap gap-1.5">
                        {evolucion.productos_usados.map((p) => (
                          <span key={p} className="px-2.5 py-1 bg-muted border border-border text-foreground text-xs rounded-full">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {evolucion.observaciones && <DetailRow icon={MessageSquare} label="Observaciones" value={evolucion.observaciones} />}
                {evolucion.recomendaciones && <DetailRow icon={CheckCheck} label="Recomendaciones" value={evolucion.recomendaciones} />}
                {evolucion.proxima_sesion_sugerida && (
                  <DetailRow
                    icon={CalendarClock}
                    label="Próxima sesión sugerida"
                    value={format(new Date(evolucion.proxima_sesion_sugerida), "d 'de' MMMM yyyy", { locale: es })}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-foreground leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección de Documentos
// ─────────────────────────────────────────────────────────────────────────────
interface StorageFile { name: string; updated_at?: string; metadata?: { size?: number; mimetype?: string } }

function DocumentosSection({ pacienteId }: { pacienteId: string }) {
  const queryClient = useQueryClient();
  const { data: archivos = [], isLoading } = useDocumentos(pacienteId);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    let ok = 0;

    for (const file of acceptedFiles) {
      const path = `${pacienteId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("documentos-pacientes").upload(path, file, { upsert: false });
      if (error) { toast.error(`Error subiendo ${file.name}: ${error.message}`); }
      else { ok++; }
    }

    setUploading(false);
    if (ok > 0) {
      toast.success(`${ok} documento${ok > 1 ? "s" : ""} subido${ok > 1 ? "s" : ""} correctamente`);
      queryClient.invalidateQueries({ queryKey: ["documentos", pacienteId] });
    }
  }, [pacienteId, queryClient]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 20 * 1024 * 1024, // 20MB
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
  });

  async function handleView(name: string) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("documentos-pacientes")
      .createSignedUrl(`${pacienteId}/${name}`, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("No se pudo obtener el enlace del archivo");
  }

  async function handleDownload(name: string) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("documentos-pacientes")
      .download(`${pacienteId}/${name}`);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.error("No se pudo descargar el archivo");
    }
  }

  const { mutate: deleteFile } = useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("documentos-pacientes")
        .remove([`${pacienteId}/${name}`]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento eliminado");
      queryClient.invalidateQueries({ queryKey: ["documentos", pacienteId] });
    },
    onError: (e: Error) => toast.error("Error: " + e.message),
  });

  function getFileIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📄";
    if (["jpg", "jpeg", "png", "webp"].includes(ext ?? "")) return "🖼️";
    if (["doc", "docx"].includes(ext ?? "")) return "📝";
    return "📎";
  }

  function formatSize(bytes?: number) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="card-premium overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-primary" />
          <div>
            <p className="label-elegant">Documentos Adjuntos</p>
            <p className="text-xs text-muted-foreground">
              {archivos.length} archivo{archivos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? "border-primary/60 bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-muted/30"
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Subiendo archivos…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/8 border border-primary/15 flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary/60" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isDragActive ? "Suelta los archivos aquí" : "Arrastra archivos o haz clic"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Word, imágenes · Máx. 20 MB por archivo
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Lista de archivos */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary/50 animate-spin" />
          </div>
        ) : archivos.length === 0 ? (
          <div className="text-center py-6">
            <FileIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay documentos adjuntos</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Sube consentimientos, análisis, recetas u otros archivos
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(archivos as StorageFile[]).map((file) => (
              <div
                key={file.name}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/30 transition-all group"
              >
                <span className="text-xl shrink-0">{getFileIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name.replace(/^\d+-/, "")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatSize(file.metadata?.size)}
                    {file.updated_at && (
                      <> · {format(new Date(file.updated_at), "d MMM yyyy", { locale: es })}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleView(file.name)}
                    className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                    title="Ver"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(file.name)}
                    className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                    title="Descargar"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteFile(file.name)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nota sobre bucket */}
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Requiere un bucket <span className="font-mono font-semibold">documentos-pacientes</span> en Supabase Storage con acceso privado.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal exportado
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  pacienteId: string;
  pacienteNombre: string;
}

export function HistoriaClinicaTab({ pacienteId, pacienteNombre }: Props) {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: historia, isLoading: loadingHistoria } = useHistoria(pacienteId);
  const { data: evoluciones = [], isLoading: loadingEvoluciones } = useEvoluciones(historia?.id ?? null);

  if (loadingHistoria) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando historia clínica…</p>
        </div>
      </div>
    );
  }

  if (!historia) {
    return (
      <CrearHistoriaCard
        pacienteId={pacienteId}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["historia", pacienteId] })}
      />
    );
  }

  return (
    <>
      <NuevaEvolucionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        historiaId={historia.id}
        pacienteId={pacienteId}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="label-elegant mb-1">Historia Clínica</p>
          <h3 className="font-serif text-xl font-semibold text-foreground">{pacienteNombre}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">{historia.numero}</p>
        </div>
        <button onClick={() => setDrawerOpen(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          Nueva Evolución
        </button>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Historia base */}
        <div className="lg:col-span-1">
          <HistoriaBaseCard historia={historia} />
        </div>

        {/* Evoluciones */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-4 h-4 text-primary" />
            <div>
              <p className="label-elegant">Evoluciones Clínicas</p>
              <p className="text-xs text-muted-foreground">
                {evoluciones.length} sesión{evoluciones.length !== 1 ? "es" : ""} registrada{evoluciones.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {loadingEvoluciones ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 text-primary/50 animate-spin" />
            </div>
          ) : evoluciones.length === 0 ? (
            <div className="card-premium p-12 text-center">
              <Edit3 className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
              <p className="font-serif text-base font-semibold text-foreground mb-1.5">Sin evoluciones registradas</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
                Registra la primera sesión clínica del paciente
              </p>
              <button onClick={() => setDrawerOpen(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                Registrar Primera Sesión
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {evoluciones.map((ev) => (
                <EvolucionCard key={ev.id} evolucion={ev} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Documentos */}
      <DocumentosSection pacienteId={pacienteId} />
    </>
  );
}
