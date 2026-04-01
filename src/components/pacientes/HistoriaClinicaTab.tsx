"use client";

import { useState, useCallback } from "react";
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
  Pencil, Save, X, Activity, HeartPulse, FlaskConical, Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { HistoriaClinica, EvolucionClinica } from "@/types/database.types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & types
// ─────────────────────────────────────────────────────────────────────────────
const TIPO_PIEL_LABELS: Record<string, string> = {
  seca: "Seca", grasa: "Grasa", mixta: "Mixta", normal: "Normal", sensible: "Sensible",
};
const FITZPATRICK_LABELS: Record<number, string> = {
  1: "I — Siempre se quema", 2: "II — Casi siempre", 3: "III — A veces",
  4: "IV — Raramente", 5: "V — Muy raramente", 6: "VI — Nunca",
};
const ANTECEDENTES_PATOLOGICOS_LIST = [
  "Asma", "DM", "HTA", "Enf. Tiroides", "Coagulopatías", "Convulsiones",
  "Migrañas", "Gastritis", "Rinitis alérgicas", "Hepatitis", "F. Tifoides", "TBC",
];
const ALERGIAS_LIST = [
  "Xilocaína", "Anestésicos", "Sulfas", "Penicilinas", "Quinolonas",
  "Macrólidos", "Ketorolaco", "AINES", "Cefalosporinas",
];
const FARMACOS_LIST_ITEMS = [
  "ACO", "Anti-Inflamatorios", "Aspirina", "Heparina", "Vitaminas",
  "Antidepresivos", "H. Tiroideas", "Antihipertensivos", "Med. Disminución de peso",
];

type HistoriaFormState = {
  motivo: string; antecedentes: string; expectativas: string;
  tipo_piel: string; fototipo: string;
  // Filiación adicional
  religion: string; estado_civil: string; grado_instruccion: string; procedencia: string;
  // Signos vitales
  fc: string; fr: string; pa: string; imc: string; rq: string; asa: string;
  // Anamnesis
  tiempo_enfermedad: string;
  // Fisiológicos
  gestacion_g: string; gestacion_p: string; menarquia: string; fur_historia: string; rc: string;
  apetito: string; sed: string; diuresis: string; deposiciones: string;
  peso_kg: string; talla: string; sueno: string; ultima_ingesta: string;
  alcohol: boolean; tabaco: boolean; drogas: boolean;
  // Patológicos
  ant_patologicos: string[]; ant_patologicos_otros: string;
  // Alergias
  alergias_medicamentos: string[]; alergias_med_otros: string;
  // Fármacos
  farmacos_lista: string[]; farmacos_otros: string;
  // Quirúrgicos y familiares
  ant_quirurgicos: string; ant_familiares: string;
};

const FORM_EMPTY: HistoriaFormState = {
  motivo: "", antecedentes: "", expectativas: "", tipo_piel: "", fototipo: "",
  religion: "", estado_civil: "", grado_instruccion: "", procedencia: "",
  fc: "", fr: "", pa: "", imc: "", rq: "", asa: "",
  tiempo_enfermedad: "",
  gestacion_g: "", gestacion_p: "", menarquia: "", fur_historia: "", rc: "",
  apetito: "", sed: "", diuresis: "", deposiciones: "", peso_kg: "", talla: "",
  sueno: "", ultima_ingesta: "",
  alcohol: false, tabaco: false, drogas: false,
  ant_patologicos: [], ant_patologicos_otros: "",
  alergias_medicamentos: [], alergias_med_otros: "",
  farmacos_lista: [], farmacos_otros: "",
  ant_quirurgicos: "", ant_familiares: "",
};

function historiaToForm(h: HistoriaClinica): HistoriaFormState {
  return {
    motivo: h.motivo_consulta_inicial ?? "",
    antecedentes: h.antecedentes_esteticos ?? "",
    expectativas: h.expectativas_paciente ?? "",
    tipo_piel: h.tipo_piel ?? "",
    fototipo: h.fototipo_fitzpatrick ? String(h.fototipo_fitzpatrick) : "",
    religion: h.religion ?? "",
    estado_civil: h.estado_civil ?? "",
    grado_instruccion: h.grado_instruccion ?? "",
    procedencia: h.procedencia ?? "",
    fc: h.fc ?? "", fr: h.fr ?? "", pa: h.pa ?? "",
    imc: h.imc ?? "", rq: h.rq ?? "", asa: h.asa ?? "",
    tiempo_enfermedad: h.tiempo_enfermedad ?? "",
    gestacion_g: h.gestacion_g ?? "", gestacion_p: h.gestacion_p ?? "",
    menarquia: h.menarquia ?? "", fur_historia: h.fur_historia ?? "", rc: h.rc ?? "",
    apetito: h.apetito ?? "", sed: h.sed ?? "", diuresis: h.diuresis ?? "",
    deposiciones: h.deposiciones ?? "", peso_kg: h.peso_kg ?? "", talla: h.talla ?? "",
    sueno: h.sueno ?? "", ultima_ingesta: h.ultima_ingesta ?? "",
    alcohol: h.alcohol ?? false, tabaco: h.tabaco ?? false, drogas: h.drogas ?? false,
    ant_patologicos: h.ant_patologicos ?? [], ant_patologicos_otros: h.ant_patologicos_otros ?? "",
    alergias_medicamentos: h.alergias_medicamentos ?? [], alergias_med_otros: h.alergias_med_otros ?? "",
    farmacos_lista: h.farmacos_lista ?? [], farmacos_otros: h.farmacos_otros ?? "",
    ant_quirurgicos: h.ant_quirurgicos ?? "", ant_familiares: h.ant_familiares ?? "",
  };
}

function formToDbPayload(form: HistoriaFormState) {
  return {
    motivo_consulta_inicial: form.motivo,
    antecedentes_esteticos: form.antecedentes || null,
    expectativas_paciente: form.expectativas || null,
    tipo_piel: form.tipo_piel || null,
    fototipo_fitzpatrick: form.fototipo ? parseInt(form.fototipo) : null,
    religion: form.religion || null,
    estado_civil: form.estado_civil || null,
    grado_instruccion: form.grado_instruccion || null,
    procedencia: form.procedencia || null,
    fc: form.fc || null, fr: form.fr || null, pa: form.pa || null,
    imc: form.imc || null, rq: form.rq || null, asa: form.asa || null,
    tiempo_enfermedad: form.tiempo_enfermedad || null,
    gestacion_g: form.gestacion_g || null, gestacion_p: form.gestacion_p || null,
    menarquia: form.menarquia || null, fur_historia: form.fur_historia || null, rc: form.rc || null,
    apetito: form.apetito || null, sed: form.sed || null, diuresis: form.diuresis || null,
    deposiciones: form.deposiciones || null, peso_kg: form.peso_kg || null, talla: form.talla || null,
    sueno: form.sueno || null, ultima_ingesta: form.ultima_ingesta || null,
    alcohol: form.alcohol, tabaco: form.tabaco, drogas: form.drogas,
    ant_patologicos: form.ant_patologicos,
    ant_patologicos_otros: form.ant_patologicos_otros || null,
    alergias_medicamentos: form.alergias_medicamentos,
    alergias_med_otros: form.alergias_med_otros || null,
    farmacos_lista: form.farmacos_lista,
    farmacos_otros: form.farmacos_otros || null,
    ant_quirurgicos: form.ant_quirurgicos || null,
    ant_familiares: form.ant_familiares || null,
  };
}

// Tipo extendido con procedimientos del catálogo
type EvolucionConProcs = EvolucionClinica & {
  procedimientos_consulta?: Array<{
    id: string;
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
        .select(`*, procedimientos_consulta(id, tratamientos_catalogo(nombre, categoria))`)
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

function useActualizarHistoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ReturnType<typeof formToDbPayload> }) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("historias_clinicas").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      toast.success("Historia clínica actualizada");
      // Invalidate all relevant queries (we don't know the paciente_id here, invalidate all historia queries)
      queryClient.invalidateQueries({ queryKey: ["historia"] });
      void id;
    },
    onError: (e: Error) => toast.error("Error: " + e.message),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────
const INPUT_CLS = "w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60";
const LABEL_CLS = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";

function CollapsibleSection({
  title, icon: Icon, children, defaultOpen = false,
}: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary/60" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckboxGroup({
  items, selected, onChange, othersValue, onOthersChange,
}: {
  items: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  othersValue?: string;
  onOthersChange?: (v: string) => void;
}) {
  function toggle(item: string) {
    onChange(selected.includes(item) ? selected.filter(i => i !== item) : [...selected, item]);
  }
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {items.map(item => (
          <label key={item} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selected.includes(item)}
              onChange={() => toggle(item)}
              className="w-3.5 h-3.5 accent-primary rounded"
            />
            <span className="text-sm text-foreground">{item}</span>
          </label>
        ))}
      </div>
      {onOthersChange !== undefined && (
        <input
          type="text"
          value={othersValue ?? ""}
          onChange={e => onOthersChange(e.target.value)}
          placeholder="Otros: especificar…"
          className={INPUT_CLS}
        />
      )}
    </div>
  );
}

function BoolCheckboxRow({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-primary rounded"
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared form fields for both creation and editing
// ─────────────────────────────────────────────────────────────────────────────
function HistoriaFormFields({
  form, setForm,
}: {
  form: HistoriaFormState;
  setForm: React.Dispatch<React.SetStateAction<HistoriaFormState>>;
}) {
  const set = (key: keyof HistoriaFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="space-y-4">
      {/* ── Datos básicos ── */}
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLS}>Motivo de consulta inicial <span className="text-red-400">*</span></label>
          <textarea rows={3} value={form.motivo} onChange={set("motivo")}
            placeholder="¿Por qué acude el paciente? ¿Qué área desea mejorar?"
            className={INPUT_CLS} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Tipo de piel</label>
            <select value={form.tipo_piel} onChange={set("tipo_piel")} className={INPUT_CLS}>
              <option value="">Seleccionar…</option>
              {Object.entries(TIPO_PIEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Fototipo Fitzpatrick</label>
            <select value={form.fototipo} onChange={set("fototipo")} className={INPUT_CLS}>
              <option value="">Seleccionar…</option>
              {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>Tipo {n}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Antecedentes estéticos previos</label>
          <textarea rows={2} value={form.antecedentes} onChange={set("antecedentes")}
            placeholder="Tratamientos previos, cirugías, rellenos, botox…" className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>Expectativas del paciente</label>
          <textarea rows={2} value={form.expectativas} onChange={set("expectativas")}
            placeholder="¿Qué resultado espera obtener?" className={INPUT_CLS} />
        </div>
      </div>

      {/* ── Filiación adicional ── */}
      <CollapsibleSection title="Filiación adicional" icon={Users}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Religión</label>
            <input type="text" value={form.religion} onChange={set("religion")} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Estado civil</label>
            <input type="text" value={form.estado_civil} onChange={set("estado_civil")}
              placeholder="Soltero/a, Casado/a…" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Grado de instrucción</label>
            <input type="text" value={form.grado_instruccion} onChange={set("grado_instruccion")}
              placeholder="Técnico, Superior…" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Procedencia</label>
            <input type="text" value={form.procedencia} onChange={set("procedencia")} className={INPUT_CLS} />
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Signos vitales ── */}
      <CollapsibleSection title="Signos vitales" icon={Activity}>
        <div className="grid grid-cols-3 gap-3">
          {(["fc", "fr", "pa", "imc", "rq", "asa"] as const).map(k => (
            <div key={k}>
              <label className={LABEL_CLS}>{k.toUpperCase()}</label>
              <input type="text" value={form[k]} onChange={set(k)} className={INPUT_CLS} />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* ── Anamnesis ── */}
      <CollapsibleSection title="Anamnesis" icon={ClipboardList}>
        <div>
          <label className={LABEL_CLS}>Tiempo de enfermedad</label>
          <textarea rows={3} value={form.tiempo_enfermedad} onChange={set("tiempo_enfermedad")}
            placeholder="Describir el tiempo y evolución de la enfermedad actual…" className={INPUT_CLS} />
        </div>
      </CollapsibleSection>

      {/* ── Antecedentes fisiológicos ── */}
      <CollapsibleSection title="Antecedentes fisiológicos" icon={HeartPulse}>
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-2">
              <label className={LABEL_CLS}>Gestación G / P</label>
              <div className="flex gap-2">
                <input type="text" value={form.gestacion_g} onChange={set("gestacion_g")}
                  placeholder="G" className={INPUT_CLS} />
                <input type="text" value={form.gestacion_p} onChange={set("gestacion_p")}
                  placeholder="P" className={INPUT_CLS} />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Menarquía</label>
              <input type="text" value={form.menarquia} onChange={set("menarquia")} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>FUR</label>
              <input type="text" value={form.fur_historia} onChange={set("fur_historia")} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>R.C.</label>
              <input type="text" value={form.rc} onChange={set("rc")} className={INPUT_CLS} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["apetito", "sed", "diuresis", "deposiciones"] as const).map(k => (
              <div key={k}>
                <label className={LABEL_CLS}>{k.charAt(0).toUpperCase() + k.slice(1)}</label>
                <input type="text" value={form[k]} onChange={set(k)} className={INPUT_CLS} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className={LABEL_CLS}>Peso (kg)</label>
              <input type="text" value={form.peso_kg} onChange={set("peso_kg")} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Talla</label>
              <input type="text" value={form.talla} onChange={set("talla")} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Sueño</label>
              <input type="text" value={form.sueno} onChange={set("sueno")} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Última ingesta</label>
              <input type="text" value={form.ultima_ingesta} onChange={set("ultima_ingesta")} className={INPUT_CLS} />
            </div>
          </div>
          <div className="flex gap-6 pt-1">
            <BoolCheckboxRow label="Alcohol" checked={form.alcohol}
              onChange={v => setForm(p => ({ ...p, alcohol: v }))} />
            <BoolCheckboxRow label="Tabaco" checked={form.tabaco}
              onChange={v => setForm(p => ({ ...p, tabaco: v }))} />
            <BoolCheckboxRow label="Drogas" checked={form.drogas}
              onChange={v => setForm(p => ({ ...p, drogas: v }))} />
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Antecedentes patológicos ── */}
      <CollapsibleSection title="Antecedentes patológicos" icon={FlaskConical}>
        <CheckboxGroup
          items={ANTECEDENTES_PATOLOGICOS_LIST}
          selected={form.ant_patologicos}
          onChange={v => setForm(p => ({ ...p, ant_patologicos: v }))}
          othersValue={form.ant_patologicos_otros}
          onOthersChange={v => setForm(p => ({ ...p, ant_patologicos_otros: v }))}
        />
      </CollapsibleSection>

      {/* ── Alergias medicamentosas ── */}
      <CollapsibleSection title="Alergias medicamentosas" icon={Pill}>
        <CheckboxGroup
          items={ALERGIAS_LIST}
          selected={form.alergias_medicamentos}
          onChange={v => setForm(p => ({ ...p, alergias_medicamentos: v }))}
          othersValue={form.alergias_med_otros}
          onOthersChange={v => setForm(p => ({ ...p, alergias_med_otros: v }))}
        />
      </CollapsibleSection>

      {/* ── Fármacos actuales ── */}
      <CollapsibleSection title="Fármacos actuales" icon={Pill}>
        <CheckboxGroup
          items={FARMACOS_LIST_ITEMS}
          selected={form.farmacos_lista}
          onChange={v => setForm(p => ({ ...p, farmacos_lista: v }))}
          othersValue={form.farmacos_otros}
          onOthersChange={v => setForm(p => ({ ...p, farmacos_otros: v }))}
        />
      </CollapsibleSection>

      {/* ── Quirúrgicos y familiares ── */}
      <CollapsibleSection title="Antecedentes quirúrgicos y familiares" icon={Users}>
        <div className="space-y-3">
          <div>
            <label className={LABEL_CLS}>Quirúrgicos</label>
            <textarea rows={2} value={form.ant_quirurgicos} onChange={set("ant_quirurgicos")}
              placeholder="Cirugías previas…" className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Familiares</label>
            <textarea rows={2} value={form.ant_familiares} onChange={set("ant_familiares")}
              placeholder="Antecedentes familiares relevantes…" className={INPUT_CLS} />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
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
function HistoriaBaseCard({ historia, pacienteId }: { historia: HistoriaClinica; pacienteId: string }) {
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
          {/* Motivo */}
          {historia.motivo_consulta_inicial && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Motivo inicial</p>
              <p className="text-foreground leading-relaxed">{historia.motivo_consulta_inicial}</p>
            </div>
          )}

          {/* Tipo piel + Fototipo */}
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

          {/* Antecedentes estéticos */}
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

          {/* Condiciones de piel */}
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

          {/* Filiación adicional */}
          {(historia.religion || historia.estado_civil || historia.grado_instruccion || historia.procedencia) && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Filiación adicional</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {historia.religion && <><span className="text-muted-foreground">Religión</span><span>{historia.religion}</span></>}
                {historia.estado_civil && <><span className="text-muted-foreground">Estado civil</span><span>{historia.estado_civil}</span></>}
                {historia.grado_instruccion && <><span className="text-muted-foreground">Instrucción</span><span>{historia.grado_instruccion}</span></>}
                {historia.procedencia && <><span className="text-muted-foreground">Procedencia</span><span>{historia.procedencia}</span></>}
              </div>
            </div>
          )}

          {/* Signos vitales */}
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

          {/* Anamnesis */}
          {historia.tiempo_enfermedad && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Tiempo de enfermedad</p>
              <p className="text-foreground leading-relaxed">{historia.tiempo_enfermedad}</p>
            </div>
          )}

          {/* Antecedentes fisiológicos */}
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

          {/* Antecedentes patológicos */}
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

          {/* Alergias */}
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

          {/* Fármacos */}
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

          {/* Quirúrgicos y familiares */}
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
// Card de Evolución
// ─────────────────────────────────────────────────────────────────────────────
function EvolucionCard({ evolucion, defaultOpen = false }: { evolucion: EvolucionConProcs; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);

  const procsDelCatalogo = (evolucion.procedimientos_consulta ?? [])
    .filter(p => p.tratamientos_catalogo)
    .map(p => p.tratamientos_catalogo!.nombre);

  const fechaFormatted = format(new Date(evolucion.fecha_atencion), "d 'de' MMMM yyyy", { locale: es });
  const horaFormatted  = format(new Date(evolucion.fecha_atencion), "HH:mm", { locale: es });

  return (
    <div className="card-premium overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left group"
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
      {/* ── Header ── */}
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

      {/* ── Contenido principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historia base */}
        <div className="lg:col-span-1">
          <HistoriaBaseCard historia={historia} pacienteId={pacienteId} />
        </div>

        {/* Timeline de evoluciones */}
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
                  <EvolucionCard key={ev.id} evolucion={ev} defaultOpen={i === 0} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Documentos ── */}
      <DocumentosSection pacienteId={pacienteId} />
    </div>
  );
}
