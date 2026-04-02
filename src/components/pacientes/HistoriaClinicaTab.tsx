"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText, Plus, Upload, Trash2, ChevronDown, ChevronUp,
  Stethoscope, Loader2, Lock, File as FileIcon,
  Edit3, Eye, Download, Syringe, ClipboardList,
  Pill, MessageSquare, CalendarClock, CheckCheck, Calendar,
  Pencil, Save, X, Check, Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { HistoriaClinica, EvolucionClinica, Tratamiento } from "@/types/database.types";
import { CATEGORIA_LABELS, type TratamientoCategoria } from "@/types/database.types";
import {
  TIPO_PIEL_LABELS, FITZPATRICK_LABELS,
  HistoriaFormState, FORM_EMPTY, historiaToForm, formToDbPayload,
  HistoriaFormFields,
} from "./HistoriaClinicaForm";

// Tipo extendido con procedimientos del catálogo
type EvolucionConProcs = EvolucionClinica & {
  procedimientos_consulta?: Array<{
    id: string;
    tratamiento_id: string;
    tratamientos_catalogo: { nombre: string; categoria: string } | null;
  }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────
function useHistoria(pacienteId: string) {
  return useQuery<HistoriaClinica | null>({
    queryKey: ["historia", pacienteId],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("historias_clinicas").select("*")
        .eq("paciente_id", pacienteId).single();
      if (error?.code === "PGRST116") return null;
      if (error) throw error;
      return data as HistoriaClinica;
    },
    retry: false,
  });
}

function useEvoluciones(historiaId: string | null) {
  return useQuery<EvolucionConProcs[]>({
    queryKey: ["evoluciones", historiaId],
    queryFn: async () => {
      if (!historiaId) return [];
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("evoluciones_clinicas")
        .select(`*, procedimientos_consulta(id, tratamiento_id, tratamientos_catalogo(nombre, categoria))`)
        .eq("historia_id", historiaId)
        .order("fecha_atencion", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EvolucionConProcs[];
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
      if (error) return [];
      return data ?? [];
    },
    retry: false,
  });
}

function useTratamientosCatalogo() {
  return useQuery<Tratamiento[]>({
    queryKey: ["tratamientos_catalogo"],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("tratamientos_catalogo")
        .select("id, nombre, codigo, categoria, duracion_vigencia_meses, intervalo_recordatorio_dias, sesiones_por_ciclo, es_permanente")
        .eq("is_active", true)
        .order("categoria").order("nombre");
      if (error) throw error;
      return (data ?? []) as Tratamiento[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

function useActualizarEvolucion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, historiaId, payload, nuevaTratamientoIds,
    }: {
      id: string; historiaId: string;
      payload: Record<string, unknown>; nuevaTratamientoIds: string[];
    }) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = supabase as any;

      // 1. Actualizar la evolución
      const { error: updError } = await s
        .from("evoluciones_clinicas").update(payload).eq("id", id);
      if (updError) throw updError;

      // 2. Obtener procedimientos actuales de esta evolución
      const { data: procsActuales } = await s
        .from("procedimientos_consulta").select("id, tratamiento_id").eq("evolucion_id", id);
      const actualesIds: string[] = (procsActuales ?? []).map((p: { id: string }) => p.id);

      // 3. Nullificar la referencia en seguimientos_renovacion antes de borrar
      //    (la FK es nullable, así que esto evita la violación de constraint)
      if (actualesIds.length > 0) {
        await s.from("seguimientos_renovacion")
          .update({ procedimiento_consulta_id: null })
          .in("procedimiento_consulta_id", actualesIds);
      }

      // 4. Borrar todos los procedimientos antiguos
      const { error: delError } = await s
        .from("procedimientos_consulta").delete().eq("evolucion_id", id);
      if (delError) throw delError;

      // 5. Insertar los nuevos seleccionados
      if (nuevaTratamientoIds.length > 0) {
        const { error: insError } = await s
          .from("procedimientos_consulta")
          .insert(nuevaTratamientoIds.map(tid => ({ evolucion_id: id, tratamiento_id: tid })));
        if (insError) throw insError;
      }
      return historiaId;
    },
    onSuccess: (historiaId) => {
      queryClient.invalidateQueries({ queryKey: ["evoluciones", historiaId] });
      toast.success("Consulta actualizada");
    },
    onError: (e: Error) => toast.error("Error: " + e.message),
  });
}

function useActualizarHistoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ReturnType<typeof formToDbPayload> }) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("historias_clinicas").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Historia clínica actualizada");
      queryClient.invalidateQueries({ queryKey: ["historia"] });
    },
    onError: (e: Error) => toast.error("Error: " + e.message),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Crear Historia Clínica
// ─────────────────────────────────────────────────────────────────────────────
function CrearHistoriaCard({ pacienteId, onCreated }: { pacienteId: string; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<HistoriaFormState>(FORM_EMPTY);

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
      condiciones_piel: [],
      abierta_por: user?.id ?? null,
      ...formToDbPayload(form),
    });
    setLoading(false);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success("Historia clínica creada");
    onCreated();
  }

  return (
    <div className="card-premium p-6 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-primary/8 border border-primary/15 flex items-center justify-center mx-auto mb-4">
          <Stethoscope className="w-7 h-7 text-primary/50" />
        </div>
        <h4 className="font-serif text-xl font-semibold mb-1">Abrir Historia Clínica</h4>
        <p className="text-sm text-muted-foreground">Complete los datos clínicos del paciente</p>
      </div>
      <form onSubmit={handleCreate} className="space-y-4">
        <HistoriaFormFields form={form} setForm={setForm} />
        <div className="gold-rule-solid" />
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {loading ? "Creando…" : "Abrir Historia Clínica"}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Historia Base Card — vista + edición inline
// ─────────────────────────────────────────────────────────────────────────────
function HistoriaBaseCard({ historia }: { historia: HistoriaClinica }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<HistoriaFormState>(() => historiaToForm(historia));
  const { mutate: actualizar, isPending } = useActualizarHistoria();

  function handleSave() {
    actualizar(
      { id: historia.id, payload: formToDbPayload(form) },
      { onSuccess: () => setEditing(false) }
    );
  }

  function handleCancel() {
    setForm(historiaToForm(historia));
    setEditing(false);
  }

  // ── VIEW MODE ──
  if (!editing) {
    return (
      <div className="card-premium overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-4 h-4 text-primary" />
            <div>
              <p className="label-elegant">Historia Base</p>
              <p className="text-xs text-muted-foreground font-mono">{historia.numero}</p>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all text-xs font-medium"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          {historia.motivo_consulta_inicial && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Motivo inicial</p>
              <p className="text-foreground leading-relaxed">{historia.motivo_consulta_inicial}</p>
            </div>
          )}
          {(historia.tipo_piel || historia.fototipo_fitzpatrick) && (
            <div className="grid grid-cols-2 gap-2.5">
              {historia.tipo_piel && (
                <div className="bg-muted/50 rounded-xl p-3 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Tipo de piel</p>
                  <p className="font-semibold text-foreground text-sm">{TIPO_PIEL_LABELS[historia.tipo_piel] ?? historia.tipo_piel}</p>
                </div>
              )}
              {historia.fototipo_fitzpatrick && (
                <div className="bg-muted/50 rounded-xl p-3 border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Fototipo</p>
                  <p className="font-semibold text-foreground text-sm">Tipo {historia.fototipo_fitzpatrick}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{FITZPATRICK_LABELS[historia.fototipo_fitzpatrick]}</p>
                </div>
              )}
            </div>
          )}
          {historia.antecedentes_esteticos && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Antecedentes estéticos</p>
              <p className="text-foreground leading-relaxed">{historia.antecedentes_esteticos}</p>
            </div>
          )}
          {historia.expectativas_paciente && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Expectativas</p>
              <p className="text-foreground leading-relaxed">{historia.expectativas_paciente}</p>
            </div>
          )}
          {historia.condiciones_piel && historia.condiciones_piel.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Condiciones</p>
              <div className="flex flex-wrap gap-1.5">
                {historia.condiciones_piel.map(c => (
                  <span key={c} className="px-2.5 py-1 bg-primary/8 border border-primary/15 text-primary text-xs rounded-full font-medium">{c}</span>
                ))}
              </div>
            </div>
          )}
          {(historia.fc || historia.fr || historia.pa || historia.imc || historia.rq || historia.asa) && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Signos vitales</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["FC", historia.fc], ["FR", historia.fr], ["PA", historia.pa],
                  ["IMC", historia.imc], ["RQ", historia.rq], ["ASA", historia.asa],
                ] as [string, string | null][]).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="bg-muted/40 rounded-lg p-2 border border-border/60">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{k}</p>
                    <p className="text-sm font-semibold">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {historia.tiempo_enfermedad && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Tiempo de enfermedad</p>
              <p className="text-foreground leading-relaxed">{historia.tiempo_enfermedad}</p>
            </div>
          )}
          {(historia.gestacion_g || historia.gestacion_p || historia.menarquia || historia.fur_historia ||
            historia.apetito || historia.sed || historia.peso_kg || historia.talla ||
            historia.alcohol || historia.tabaco || historia.drogas) && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Antecedentes fisiológicos</p>
              <div className="space-y-1 text-xs">
                {(historia.gestacion_g || historia.gestacion_p) && (
                  <p><span className="text-muted-foreground">Gestación:</span> G{historia.gestacion_g} P{historia.gestacion_p}</p>
                )}
                {historia.menarquia && <p><span className="text-muted-foreground">Menarquía:</span> {historia.menarquia}</p>}
                {historia.fur_historia && <p><span className="text-muted-foreground">FUR:</span> {historia.fur_historia}</p>}
                {(historia.peso_kg || historia.talla) && (
                  <p>
                    {historia.peso_kg && <><span className="text-muted-foreground">Peso:</span> {historia.peso_kg} kg  </>}
                    {historia.talla && <><span className="text-muted-foreground">Talla:</span> {historia.talla}</>}
                  </p>
                )}
                {(historia.alcohol || historia.tabaco || historia.drogas) && (
                  <div className="flex gap-2 pt-0.5">
                    {historia.alcohol && <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[10px] font-medium">Alcohol</span>}
                    {historia.tabaco && <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[10px] font-medium">Tabaco</span>}
                    {historia.drogas && <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 rounded text-[10px] font-medium">Drogas</span>}
                  </div>
                )}
              </div>
            </div>
          )}
          {historia.ant_patologicos && historia.ant_patologicos.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Antecedentes patológicos</p>
              <div className="flex flex-wrap gap-1.5">
                {historia.ant_patologicos.map(a => (
                  <span key={a} className="px-2 py-0.5 bg-red-50 border border-red-100 text-red-700 text-[10px] rounded font-medium">{a}</span>
                ))}
                {historia.ant_patologicos_otros && (
                  <span className="px-2 py-0.5 bg-muted border border-border text-muted-foreground text-[10px] rounded">{historia.ant_patologicos_otros}</span>
                )}
              </div>
            </div>
          )}
          {historia.alergias_medicamentos && historia.alergias_medicamentos.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Alergias medicamentosas</p>
              <div className="flex flex-wrap gap-1.5">
                {historia.alergias_medicamentos.map(a => (
                  <span key={a} className="px-2 py-0.5 bg-orange-50 border border-orange-100 text-orange-700 text-[10px] rounded font-medium">{a}</span>
                ))}
                {historia.alergias_med_otros && (
                  <span className="px-2 py-0.5 bg-muted border border-border text-muted-foreground text-[10px] rounded">{historia.alergias_med_otros}</span>
                )}
              </div>
            </div>
          )}
          {historia.farmacos_lista && historia.farmacos_lista.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Fármacos actuales</p>
              <div className="flex flex-wrap gap-1.5">
                {historia.farmacos_lista.map(f => (
                  <span key={f} className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] rounded font-medium">{f}</span>
                ))}
                {historia.farmacos_otros && (
                  <span className="px-2 py-0.5 bg-muted border border-border text-muted-foreground text-[10px] rounded">{historia.farmacos_otros}</span>
                )}
              </div>
            </div>
          )}
          {(historia.ant_quirurgicos || historia.ant_familiares) && (
            <div className="pt-2 border-t border-border/50 space-y-2">
              {historia.ant_quirurgicos && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Ant. quirúrgicos</p>
                  <p className="text-xs text-foreground">{historia.ant_quirurgicos}</p>
                </div>
              )}
              {historia.ant_familiares && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Ant. familiares</p>
                  <p className="text-xs text-foreground">{historia.ant_familiares}</p>
                </div>
              )}
            </div>
          )}
          <div className="pt-2 border-t border-border/50">
            <p className="text-[11px] text-muted-foreground/60">
              Abierta el {format(new Date(historia.created_at), "d MMM yyyy", { locale: es })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── EDIT MODE ──
  return (
    <div className="card-premium overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Pencil className="w-4 h-4 text-primary" />
          <div>
            <p className="label-elegant">Editando Historia</p>
            <p className="text-xs text-muted-foreground font-mono">{historia.numero}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 text-muted-foreground transition-all text-xs font-medium">
            <X className="w-3.5 h-3.5" /> Cancelar
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-hover transition-all text-xs font-medium disabled:opacity-60">
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
      <div className="p-5">
        <HistoriaFormFields form={form} setForm={setForm} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer de edición de consulta
// ─────────────────────────────────────────────────────────────────────────────
const INPUT_E = "w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50";
const LABEL_E = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";

function EditarConsultaDrawer({
  evolucion, historiaId, open, onClose,
}: {
  evolucion: EvolucionConProcs; historiaId: string; open: boolean; onClose: () => void;
}) {
  const { mutate, isPending } = useActualizarEvolucion();
  const { data: tratamientos = [] } = useTratamientosCatalogo();

  const currentTratIds = (evolucion.procedimientos_consulta ?? [])
    .map(p => p.tratamiento_id)
    .filter(Boolean) as string[];

  const fechaIso = evolucion.fecha_atencion ? new Date(evolucion.fecha_atencion) : new Date();

  const [selectedTrats, setSelectedTrats] = useState<string[]>([]);
  const [catSearch, setCatSearch]         = useState("");
  const [clinicaOpen, setClinicaOpen]     = useState(false);
  const [fields, setFields] = useState({
    fecha:                  "",
    hora:                   "",
    observaciones:          evolucion.observaciones          ?? "",
    proxima_sesion:         evolucion.proxima_sesion_sugerida ? evolucion.proxima_sesion_sugerida.slice(0, 10) : "",
    motivo_consulta:        evolucion.motivo_consulta        ?? "",
    signos_sintomas:        evolucion.signos_sintomas         ?? "",
    examen_fisico:          evolucion.examen_fisico           ?? "",
    fur:                    evolucion.fur                     ?? "",
    ram:                    evolucion.ram                     ?? "",
    antecedentes:           evolucion.antecedentes            ?? "",
    examenes_auxiliares:    evolucion.examenes_auxiliares     ?? "",
    medicacion:             evolucion.medicacion              ?? "",
    diagnostico:            evolucion.diagnostico             ?? "",
    recomendaciones:        evolucion.recomendaciones         ?? "",
  });

  // Inicializar cuando abre
  useEffect(() => {
    if (!open) return;
    setSelectedTrats(currentTratIds);
    setCatSearch("");
    setClinicaOpen(false);
    setFields({
      fecha:               fechaIso.toISOString().split("T")[0],
      hora:                fechaIso.toTimeString().slice(0, 5),
      observaciones:       evolucion.observaciones          ?? "",
      proxima_sesion:      evolucion.proxima_sesion_sugerida ? evolucion.proxima_sesion_sugerida.slice(0, 10) : "",
      motivo_consulta:     evolucion.motivo_consulta        ?? "",
      signos_sintomas:     evolucion.signos_sintomas         ?? "",
      examen_fisico:       evolucion.examen_fisico           ?? "",
      fur:                 evolucion.fur                     ?? "",
      ram:                 evolucion.ram                     ?? "",
      antecedentes:        evolucion.antecedentes            ?? "",
      examenes_auxiliares: evolucion.examenes_auxiliares     ?? "",
      medicacion:          evolucion.medicacion              ?? "",
      diagnostico:         evolucion.diagnostico             ?? "",
      recomendaciones:     evolucion.recomendaciones         ?? "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields(p => ({ ...p, [k]: e.target.value }));

  const toggle = (id: string) =>
    setSelectedTrats(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const filtered = catSearch
    ? tratamientos.filter(t => t.nombre.toLowerCase().includes(catSearch.toLowerCase()))
    : tratamientos;
  const porCategoria = filtered.reduce<Record<string, typeof filtered>>((acc, t) => {
    if (!acc[t.categoria]) acc[t.categoria] = [];
    acc[t.categoria].push(t);
    return acc;
  }, {});

  function handleSave() {
    const fechaHora = `${fields.fecha}T${fields.hora}:00`;
    const procedimientoResumen = selectedTrats
      .map(id => tratamientos.find(t => t.id === id)?.nombre)
      .filter(Boolean).join(", ");

    mutate({
      id: evolucion.id,
      historiaId,
      nuevaTratamientoIds: selectedTrats,
      payload: {
        fecha_atencion:          fechaHora,
        motivo_consulta:         fields.motivo_consulta     || evolucion.motivo_consulta,
        signos_sintomas:         fields.signos_sintomas     || null,
        examen_fisico:           fields.examen_fisico       || null,
        fur:                     fields.fur                 || null,
        ram:                     fields.ram                 || null,
        antecedentes:            fields.antecedentes        || null,
        examenes_auxiliares:     fields.examenes_auxiliares || null,
        medicacion:              fields.medicacion          || null,
        diagnostico:             fields.diagnostico         || null,
        procedimiento:           procedimientoResumen       || evolucion.procedimiento,
        observaciones:           fields.observaciones       || null,
        recomendaciones:         fields.recomendaciones     || null,
        proxima_sesion_sugerida: fields.proxima_sesion      || null,
      },
    }, { onSuccess: onClose });
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-background shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background shrink-0">
          <div>
            <p className="label-elegant mb-0.5">Editar Consulta</p>
            <p className="text-xs text-muted-foreground font-mono">
              {format(fechaIso, "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Fecha + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_E}>Fecha</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input type="date" value={fields.fecha} onChange={set("fecha")} className={`${INPUT_E} pl-9`} />
              </div>
            </div>
            <div>
              <label className={LABEL_E}>Hora</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input type="time" value={fields.hora} onChange={set("hora")} className={`${INPUT_E} pl-9`} />
              </div>
            </div>
          </div>

          {/* Procedimientos */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Syringe className="w-3.5 h-3.5 text-primary" />
              <label className={LABEL_E}>Procedimientos realizados</label>
            </div>
            {selectedTrats.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5 p-3 bg-primary/5 rounded-xl border border-primary/15">
                {selectedTrats.map(id => {
                  const t = tratamientos.find(x => x.id === id);
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
            <input type="text" value={catSearch} onChange={e => setCatSearch(e.target.value)}
              placeholder="Buscar procedimiento…" className={`${INPUT_E} mb-3`} />
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/60 max-h-56 overflow-y-auto">
              {Object.entries(porCategoria).map(([cat, items]) => (
                <div key={cat}>
                  <p className="px-3.5 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/40 sticky top-0">
                    {CATEGORIA_LABELS[cat as TratamientoCategoria] ?? cat}
                  </p>
                  {items.map(t => {
                    const sel = selectedTrats.includes(t.id);
                    return (
                      <button key={t.id} type="button" onClick={() => toggle(t.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors ${sel ? "bg-primary/8" : "hover:bg-muted/40"}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? "bg-primary border-primary" : "border-border"}`}>
                          {sel && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`flex-1 font-medium ${sel ? "text-primary" : "text-foreground"}`}>{t.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className={LABEL_E}>Notas / Observaciones</label>
            <textarea value={fields.observaciones} onChange={set("observaciones")} rows={3}
              className={`${INPUT_E} resize-none`}
              placeholder="Resultado del procedimiento, incidencias, indicaciones post…" />
          </div>

          {/* Próxima sesión */}
          <div>
            <label className={LABEL_E}>Próxima sesión sugerida</label>
            <div className="relative">
              <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input type="date" value={fields.proxima_sesion} onChange={set("proxima_sesion")} className={`${INPUT_E} pl-9`} />
            </div>
          </div>

          {/* Datos clínicos adicionales */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button type="button" onClick={() => setClinicaOpen(v => !v)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${clinicaOpen ? "bg-muted/40" : "hover:bg-muted/20"}`}>
              <ClipboardList className="w-4 h-4 text-primary/60 shrink-0" />
              <span className="flex-1 text-sm font-medium">Datos clínicos adicionales</span>
              <span className="text-xs text-muted-foreground mr-1">Motivo, examen, RAM…</span>
              {clinicaOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>
            {clinicaOpen && (
              <div className="px-5 pb-5 pt-3 space-y-4 border-t border-border/60">
                {[
                  { k: "motivo_consulta" as const,      label: "Motivo de consulta",           placeholder: "¿Por qué acude hoy?" },
                  { k: "signos_sintomas" as const,      label: "Signos y síntomas",             placeholder: "…" },
                  { k: "examen_fisico" as const,        label: "Examen físico",                 placeholder: "Hallazgos…" },
                  { k: "diagnostico" as const,          label: "Diagnóstico",                   placeholder: "Diagnóstico clínico…" },
                  { k: "ram" as const,                  label: "RAM (reacciones adversas)",     placeholder: "Alergias conocidas…" },
                  { k: "antecedentes" as const,         label: "Antecedentes",                  placeholder: "Médicos, quirúrgicos…" },
                  { k: "medicacion" as const,           label: "Medicación actual",             placeholder: "Medicamentos en uso…" },
                  { k: "examenes_auxiliares" as const,  label: "Exámenes auxiliares",           placeholder: "Laboratorio, imágenes…" },
                  { k: "fur" as const,                  label: "FUR — Fecha última regla",      placeholder: "" },
                  { k: "recomendaciones" as const,      label: "Recomendaciones post-procedimiento", placeholder: "Cuidados, restricciones…" },
                ].map(({ k, label, placeholder }) => (
                  <div key={k}>
                    <label className={LABEL_E}>{label}</label>
                    {k === "fur" ? (
                      <input type="date" value={fields[k]} onChange={set(k)} className={INPUT_E} />
                    ) : (
                      <textarea value={fields[k]} onChange={set(k)} rows={2}
                        className={`${INPUT_E} resize-none`} placeholder={placeholder} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/10 flex gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={isPending || selectedTrats.length === 0}
            className="flex-1 btn-primary py-2.5 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            {isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
              : <><Save className="w-4 h-4" /> Guardar cambios</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card de Evolución
// ─────────────────────────────────────────────────────────────────────────────
function EvolucionCard({ evolucion, historiaId, defaultOpen = false }: { evolucion: EvolucionConProcs; historiaId: string; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [editOpen, setEditOpen] = useState(false);

  const procsDelCatalogo = (evolucion.procedimientos_consulta ?? [])
    .filter(p => p.tratamientos_catalogo)
    .map(p => p.tratamientos_catalogo!.nombre);

  const fechaFormatted = format(new Date(evolucion.fecha_atencion), "d 'de' MMMM yyyy", { locale: es });
  const horaFormatted  = format(new Date(evolucion.fecha_atencion), "HH:mm", { locale: es });

  return (
    <div className="card-premium overflow-hidden">
      <div className="flex items-start gap-4 px-5 py-4">
        <button
          onClick={() => setExpanded(p => !p)}
          className="flex-1 flex items-start gap-4 text-left min-w-0"
        >
        <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
          <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary/30" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <p className="font-serif font-semibold text-foreground leading-tight">
              {fechaFormatted}
              <span className="ml-2 text-xs font-normal text-muted-foreground font-sans">{horaFormatted}</span>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {evolucion.is_locked && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[10px] font-semibold uppercase">
                  <Lock className="w-2.5 h-2.5" /> Firmada
                </span>
              )}
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          {procsDelCatalogo.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {procsDelCatalogo.map(nombre => (
                <span key={nombre} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-semibold">
                  <Syringe className="w-2.5 h-2.5" />{nombre}
                </span>
              ))}
            </div>
          )}
          {(evolucion.motivo_consulta || evolucion.procedimiento) && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {evolucion.motivo_consulta || evolucion.procedimiento}
            </p>
          )}
          {evolucion.zona_tratada && evolucion.zona_tratada.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {evolucion.zona_tratada.map(z => (
                <span key={z} className="px-1.5 py-0.5 bg-muted border border-border/80 text-muted-foreground text-[10px] rounded font-medium">{z}</span>
              ))}
            </div>
          )}
        </div>
        </button>
        {/* Botón editar — fuera del botón expand */}
        {!evolucion.is_locked && (
          <button
            onClick={() => setEditOpen(true)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all text-xs font-medium self-center"
          >
            <Pencil className="w-3 h-3" /> Editar
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60 px-5 pb-5 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                {evolucion.procedimiento && procsDelCatalogo.length === 0 && (
                  <DetailBlock icon={Syringe} label="Procedimiento" value={evolucion.procedimiento} full />
                )}
                {evolucion.motivo_consulta && (
                  <DetailBlock icon={ClipboardList} label="Motivo" value={evolucion.motivo_consulta} full />
                )}
                {evolucion.examen_fisico && (
                  <DetailBlock icon={Eye} label="Examen físico" value={evolucion.examen_fisico} />
                )}
                {evolucion.diagnostico && (
                  <DetailBlock icon={Stethoscope} label="Diagnóstico" value={evolucion.diagnostico} />
                )}
                {evolucion.productos_usados && evolucion.productos_usados.length > 0 && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Pill className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Productos utilizados</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {evolucion.productos_usados.map(p => (
                        <span key={p} className="px-2.5 py-1 bg-muted border border-border text-foreground text-xs rounded-full">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                {evolucion.observaciones && (
                  <DetailBlock icon={MessageSquare} label="Observaciones" value={evolucion.observaciones} full />
                )}
                {evolucion.recomendaciones && (
                  <DetailBlock icon={CheckCheck} label="Recomendaciones" value={evolucion.recomendaciones} full />
                )}
                {evolucion.proxima_sesion_sugerida && (
                  <DetailBlock
                    icon={CalendarClock}
                    label="Próxima sesión"
                    value={format(new Date(evolucion.proxima_sesion_sugerida), "d 'de' MMMM yyyy", { locale: es })}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditarConsultaDrawer
        evolucion={evolucion}
        historiaId={historiaId}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}

function DetailBlock({ icon: Icon, label, value, full }: { icon: React.ElementType; label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-foreground leading-relaxed text-sm">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Documentos
// ─────────────────────────────────────────────────────────────────────────────
interface StorageFile { name: string; updated_at?: string; metadata?: { size?: number } }

function DocumentosSection({ pacienteId }: { pacienteId: string }) {
  const queryClient = useQueryClient();
  const { data: archivos = [], isLoading } = useDocumentos(pacienteId);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    const supabase = createClient();
    let ok = 0;
    for (const file of acceptedFiles) {
      const { error } = await supabase.storage.from("documentos-pacientes")
        .upload(`${pacienteId}/${Date.now()}-${file.name}`, file, { upsert: false });
      if (error) toast.error(`Error: ${error.message}`); else ok++;
    }
    setUploading(false);
    if (ok > 0) { toast.success(`${ok} documento(s) subido(s)`); queryClient.invalidateQueries({ queryKey: ["documentos", pacienteId] }); }
  }, [pacienteId, queryClient]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxSize: 20 * 1024 * 1024,
    accept: {
      "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png", ".webp"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
  });

  async function handleView(name: string) {
    const supabase = createClient();
    const { data } = await supabase.storage.from("documentos-pacientes").createSignedUrl(`${pacienteId}/${name}`, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("No se pudo obtener el enlace");
  }

  async function handleDownload(name: string) {
    const supabase = createClient();
    const { data } = await supabase.storage.from("documentos-pacientes").download(`${pacienteId}/${name}`);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
    } else toast.error("No se pudo descargar");
  }

  const { mutate: deleteFile } = useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient();
      const { error } = await supabase.storage.from("documentos-pacientes").remove([`${pacienteId}/${name}`]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Documento eliminado"); queryClient.invalidateQueries({ queryKey: ["documentos", pacienteId] }); },
    onError: (e: Error) => toast.error("Error: " + e.message),
  });

  function formatSize(b?: number) {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="card-premium overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <FileText className="w-4 h-4 text-primary" />
        <div>
          <p className="label-elegant">Documentos Adjuntos</p>
          <p className="text-xs text-muted-foreground">{archivos.length} archivo(s)</p>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div {...getRootProps()}
          className={`border-2 border-dashed rounded-xl px-6 py-6 text-center cursor-pointer transition-all ${isDragActive ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}>
          <input {...getInputProps()} />
          {uploading
            ? <div className="flex flex-col items-center gap-2"><Loader2 className="w-7 h-7 text-primary animate-spin" /><p className="text-sm text-muted-foreground">Subiendo…</p></div>
            : <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-primary/50" />
                <p className="text-sm font-medium">{isDragActive ? "Suelta aquí" : "Arrastra o haz clic"}</p>
                <p className="text-xs text-muted-foreground">PDF, Word, imágenes · Máx. 20 MB</p>
              </div>}
        </div>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-primary/50 animate-spin" /></div>
        ) : archivos.length === 0 ? (
          <div className="text-center py-6">
            <FileIcon className="w-8 h-8 text-muted-foreground/25 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin documentos adjuntos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(archivos as StorageFile[]).map(file => (
              <div key={file.name} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/30 transition-all group">
                <span className="text-lg shrink-0">{file.name.endsWith(".pdf") ? "📄" : file.name.match(/\.(jpg|jpeg|png|webp)$/i) ? "🖼️" : "📝"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name.replace(/^\d+-/, "")}</p>
                  <p className="text-[11px] text-muted-foreground">{formatSize(file.metadata?.size)}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleView(file.name)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all" title="Ver"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDownload(file.name)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all" title="Descargar"><Download className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteFile(file.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-all" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal exportado
// ─────────────────────────────────────────────────────────────────────────────
interface Props { pacienteId: string; pacienteNombre: string }

export function HistoriaClinicaTab({ pacienteId, pacienteNombre }: Props) {
  const queryClient = useQueryClient();
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="label-elegant mb-1">Historia Clínica</p>
          <h3 className="font-serif text-xl font-semibold">{pacienteNombre}</h3>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">{historia.numero}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{evoluciones.length}</strong> sesión{evoluciones.length !== 1 ? "es" : ""}</span>
          {evoluciones.length > 0 && (
            <>
              <span className="text-border">·</span>
              <span>Última: <strong className="text-foreground">
                {format(new Date(evoluciones[0].fecha_atencion), "d MMM yyyy", { locale: es })}
              </strong></span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <HistoriaBaseCard historia={historia} />
        </div>
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="label-elegant">Historial de Consultas</p>
          </div>
          {loadingEvoluciones ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 text-primary/50 animate-spin" />
            </div>
          ) : evoluciones.length === 0 ? (
            <div className="card-premium p-12 text-center">
              <Edit3 className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
              <p className="font-serif text-base font-semibold mb-1.5">Sin consultas registradas</p>
              <p className="text-sm text-muted-foreground">Usa el botón &quot;Nueva Consulta&quot; en la parte superior para registrar la primera sesión.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-[18px] top-5 bottom-5 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
              <div className="space-y-2 pl-1">
                {evoluciones.map((ev, i) => (
                  <EvolucionCard key={ev.id} evolucion={ev} historiaId={historia.id} defaultOpen={i === 0} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <DocumentosSection pacienteId={pacienteId} />
    </div>
  );
}
