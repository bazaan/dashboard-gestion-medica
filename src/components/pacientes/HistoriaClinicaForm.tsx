"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { HistoriaClinica } from "@/types/database.types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
export const TIPO_PIEL_LABELS: Record<string, string> = {
  seca: "Seca", grasa: "Grasa", mixta: "Mixta", normal: "Normal", sensible: "Sensible",
};
export const FITZPATRICK_LABELS: Record<number, string> = {
  1: "I — Siempre se quema", 2: "II — Casi siempre", 3: "III — A veces",
  4: "IV — Raramente", 5: "V — Muy raramente", 6: "VI — Nunca",
};
export const ANTECEDENTES_PATOLOGICOS_LIST = [
  "Asma", "DM", "HTA", "Enf. Tiroides", "Coagulopatías", "Convulsiones",
  "Migrañas", "Gastritis", "Rinitis alérgicas", "Hepatitis", "F. Tifoides", "TBC",
];
export const ALERGIAS_LIST = [
  "Xilocaína", "Anestésicos", "Sulfas", "Penicilinas", "Quinolonas",
  "Macrólidos", "Ketorolaco", "AINES", "Cefalosporinas",
];
export const FARMACOS_LIST_ITEMS = [
  "ACO", "Anti-Inflamatorios", "Aspirina", "Heparina", "Vitaminas",
  "Antidepresivos", "H. Tiroideas", "Antihipertensivos", "Med. Disminución de peso",
];

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────
export type HistoriaFormState = {
  motivo: string; antecedentes: string; expectativas: string;
  tipo_piel: string; fototipo: string;
  religion: string; estado_civil: string; grado_instruccion: string; procedencia: string;
  fc: string; fr: string; pa: string; imc: string; rq: string; asa: string;
  tiempo_enfermedad: string;
  gestacion_g: string; gestacion_p: string; menarquia: string; fur_historia: string; rc: string;
  apetito: string; sed: string; diuresis: string; deposiciones: string;
  peso_kg: string; talla: string; sueno: string; ultima_ingesta: string;
  alcohol: boolean; tabaco: boolean; drogas: boolean;
  ant_patologicos: string[]; ant_patologicos_otros: string;
  alergias_medicamentos: string[]; alergias_med_otros: string;
  farmacos_lista: string[]; farmacos_otros: string;
  ant_quirurgicos: string; ant_familiares: string;
};

export const FORM_EMPTY: HistoriaFormState = {
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

export function historiaToForm(h: HistoriaClinica): HistoriaFormState {
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

export function formToDbPayload(form: HistoriaFormState) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────
export const INPUT_CLS = "w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60";
export const LABEL_CLS = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";

export function CollapsibleSection({
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

export function CheckboxGroup({
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

export function BoolCheckboxRow({
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
// Main shared form component
// ─────────────────────────────────────────────────────────────────────────────
import { Activity, ClipboardList, HeartPulse, FlaskConical, Pill, Users } from "lucide-react";

export function HistoriaFormFields({
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
