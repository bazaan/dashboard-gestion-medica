"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone, Send, Loader2, RefreshCw, Users, CheckCircle2,
  AlertTriangle, Filter, ChevronDown, ChevronUp, Search, X,
  Smartphone, Check, History, DollarSign, BarChart3,
  ChevronRight, Phone,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { RoleGuard } from "@/components/RoleGuard";

// ── Types ───────────────────────────────────────────────────────────────────

type MetaTemplate = {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: { type: string; text?: string; buttons?: { type: string; text: string }[] }[];
};

type Patient = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  estado: string;
  sexo: string | null;
  fecha_nacimiento: string | null;
  distrito: string | null;
  nivel_paciente: string | null;
  nivel_atencion: string | null;
};

type SendResult = {
  id: string;
  nombre: string;
  status: string;
  error?: string;
};

type CampanaRow = {
  id: string;
  nombre: string;
  template_name: string;
  total: number;
  enviados: number;
  fallidos: number;
  omitidos: number;
  costo_estimado: number;
  created_at: string;
};

type DestinatarioRow = {
  id: string;
  nombre: string;
  telefono: string | null;
  estado: string;
  error_msg: string | null;
};

type Tab = "nueva" | "historial";

// ── WA Preview helper ───────────────────────────────────────────────────────

function renderWAText(raw: string, vars: Record<string, string>) {
  let txt = raw;
  Object.entries(vars).forEach(([k, v]) => {
    txt = txt.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v || `{{${k}}}`);
  });
  return txt.split("\n").map((line, li) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/^\*([^*]+)\*/);
      const italicMatch = remaining.match(/^_([^_]+)_/);
      if (boldMatch) {
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
      } else if (italicMatch) {
        parts.push(<em key={key++} className="italic opacity-80">{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
      } else {
        const next = remaining.search(/[*_]/);
        if (next === -1) { parts.push(<span key={key++}>{remaining}</span>); remaining = ""; }
        else { parts.push(<span key={key++}>{remaining.slice(0, next)}</span>); remaining = remaining.slice(next); }
      }
    }
    return <p key={li} className={li === 0 ? "" : "mt-1"}>{parts}</p>;
  });
}

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-PE", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Costo por plantilla MARKETING Peru (USD)
const COSTO_UNITARIO_USD = 0.07;

// ── Tab: Nueva Campana ──────────────────────────────────────────────────────

function TabNuevaCampana({ onSent }: { onSent: () => void }) {
  const supabase = createClient();

  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterSexo, setFilterSexo] = useState("");
  const [filterEdadMin, setFilterEdadMin] = useState("");
  const [filterEdadMax, setFilterEdadMax] = useState("");
  const [filterDistrito, setFilterDistrito] = useState("");
  const [filterNivel, setFilterNivel] = useState("");
  const [filterAtencion, setFilterAtencion] = useState("");
  const [filterPais, setFilterPais] = useState("");
  const [filterProcedimiento, setFilterProcedimiento] = useState("");
  const [filterRenovacion, setFilterRenovacion] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [tratamientos, setTratamientos] = useState<{ id: string; nombre: string }[]>([]);
  const [pacientesPorTratamiento, setPacientesPorTratamiento] = useState<Set<string>>(new Set());
  const [enrichedData, setEnrichedData] = useState<Record<string, { procedimientos: string[]; renovaciones: { estado: string; dias: number | null; tratamiento: string }[] }>>({});

  const [defaultTratamiento, setDefaultTratamiento] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [costoResult, setCostoResult] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/staff/api/templates");
      const data = await res.json();
      setTemplates((data.templates ?? []).filter((t: MetaTemplate) => t.status === "APPROVED"));
    } catch { /* ignore */ }
    setLoadingTemplates(false);
  }, []);

  const fetchPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("pacientes")
        .select("id, nombres, apellidos, telefono, estado, sexo, fecha_nacimiento, distrito, nivel_paciente, nivel_atencion")
        .order("nombres", { ascending: true });
      setPatients(data || []);
    } catch { /* ignore */ }
    setLoadingPatients(false);
  }, [supabase]);

  const fetchTratamientos = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("tratamientos_catalogo")
      .select("id, nombre")
      .eq("is_active", true)
      .order("nombre");
    setTratamientos(data || []);
  }, [supabase]);

  const fetchEnriched = useCallback(async () => {
    try {
      const res = await fetch("/staff/api/patients-enriched");
      if (res.ok) {
        const data = await res.json();
        setEnrichedData(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchPatients();
    fetchTratamientos();
    fetchEnriched();
  }, [fetchTemplates, fetchPatients, fetchTratamientos, fetchEnriched]);

  // When procedimiento filter changes, fetch matching patient IDs via server API (bypasses RLS)
  useEffect(() => {
    if (!filterProcedimiento) {
      setPacientesPorTratamiento(new Set());
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/staff/api/patients-by-procedure?tratamiento_id=${filterProcedimiento}`);
        const data = await res.json();
        setPacientesPorTratamiento(new Set(data.patient_ids || []));
      } catch (e) {
        console.error("Error fetching patients by procedure:", e);
        setPacientesPorTratamiento(new Set());
      }
    })();
  }, [filterProcedimiento]);

  function calcAge(fechaNac: string | null): number | null {
    if (!fechaNac) return null;
    const birth = new Date(fechaNac);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  const distritos = useMemo(() => {
    const set = new Set<string>();
    patients.forEach(p => {
      if (p.distrito) set.add(p.distrito.trim().toUpperCase());
    });
    return [...set].sort();
  }, [patients]);

  const activeFilterCount = [filterEstado, filterSexo, filterEdadMin, filterEdadMax, filterDistrito, filterNivel, filterAtencion, filterPais, filterProcedimiento, filterRenovacion].filter(Boolean).length;

  const filteredPatients = useMemo(() => {
    let list = patients;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.nombres?.toLowerCase().includes(q) ||
        p.apellidos?.toLowerCase().includes(q) ||
        p.telefono?.includes(q)
      );
    }
    if (filterEstado) list = list.filter(p => p.estado === filterEstado);
    if (filterSexo) list = list.filter(p => p.sexo === filterSexo);
    if (filterEdadMin) {
      const min = parseInt(filterEdadMin);
      if (!isNaN(min)) list = list.filter(p => { const a = calcAge(p.fecha_nacimiento); return a !== null && a >= min; });
    }
    if (filterEdadMax) {
      const max = parseInt(filterEdadMax);
      if (!isNaN(max)) list = list.filter(p => { const a = calcAge(p.fecha_nacimiento); return a !== null && a <= max; });
    }
    if (filterDistrito) list = list.filter(p => p.distrito?.trim().toUpperCase() === filterDistrito);
    if (filterNivel) list = list.filter(p => (p.nivel_paciente || "verde") === filterNivel);
    if (filterAtencion) list = list.filter(p => (p.nivel_atencion || "normal") === filterAtencion);
    if (filterPais === "peru") list = list.filter(p => !p.telefono || p.telefono.startsWith("+51") || p.telefono.startsWith("51") || /^9\d{8}$/.test(p.telefono));
    if (filterPais === "extranjero") list = list.filter(p => p.telefono && !p.telefono.startsWith("+51") && !p.telefono.startsWith("51") && !/^9\d{8}$/.test(p.telefono));
    if (filterProcedimiento && pacientesPorTratamiento.size > 0) list = list.filter(p => pacientesPorTratamiento.has(p.id));
    else if (filterProcedimiento && pacientesPorTratamiento.size === 0) list = [];
    if (filterRenovacion) {
      list = list.filter(p => {
        const renos = enrichedData[p.id]?.renovaciones;
        if (!renos || renos.length === 0) return filterRenovacion === "sin_renovacion";
        if (filterRenovacion === "vencido") return renos.some(r => r.estado === "vencido");
        if (filterRenovacion === "proximo") return renos.some(r => r.estado === "proximo_vencer" || r.estado === "proximo");
        if (filterRenovacion === "vigente") return renos.some(r => r.estado === "vigente");
        if (filterRenovacion === "sin_renovacion") return false;
        return true;
      });
    }
    return list;
  }, [patients, searchQuery, filterEstado, filterSexo, filterEdadMin, filterEdadMax, filterDistrito, filterNivel, filterAtencion, filterPais, filterProcedimiento, pacientesPorTratamiento, filterRenovacion, enrichedData]);

  useEffect(() => {
    if (selectAll) setSelectedIds(new Set(filteredPatients.map(p => p.id)));
  }, [selectAll, filteredPatients]);

  function togglePatient(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectAll(false);
  }

  function handleSelectAll() {
    if (selectAll) { setSelectedIds(new Set()); setSelectAll(false); }
    else { setSelectedIds(new Set(filteredPatients.map(p => p.id))); setSelectAll(true); }
  }

  const templateBody = selectedTemplate?.components?.find(c => c.type === "BODY")?.text || "";
  const templateButtons = selectedTemplate?.components?.find(c => c.type === "BUTTONS")?.buttons || [];
  const templateVars = [...new Set([...(templateBody.matchAll(/\{\{([a-zA-Z_]+)\}\}/g) || [])].map(m => m[1]))];

  const selectedCount = selectedIds.size;
  const costoEstimado = selectedCount * COSTO_UNITARIO_USD;

  async function handleSend() {
    if (!selectedTemplate) { toast.error("Selecciona una plantilla"); return; }
    if (selectedIds.size === 0) { toast.error("Selecciona al menos un paciente"); return; }

    const confirmMsg = `Enviar "${selectedTemplate.name}" a ${selectedIds.size} paciente${selectedIds.size > 1 ? "s" : ""}?\nCosto estimado: $${costoEstimado.toFixed(2)} USD`;
    if (!confirm(confirmMsg)) return;

    setSending(true);
    setResults(null);
    setCostoResult(null);

    try {
      const allIds = [...selectedIds];
      const BATCH_SIZE = 5;
      const allResults: SendResult[] = [];
      let totalSent = 0, totalFailed = 0, totalSkipped = 0;
      let campanaId: string | null = null;

      // Enviar en batches de 5 para evitar timeout de Netlify
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batchIds = allIds.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(allIds.length / BATCH_SIZE);

        toast.info(`Enviando batch ${batchNum}/${totalBatches}...`);

        const batchRes: Response = await fetch("/staff/api/campaigns/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_name: selectedTemplate.name,
            template_language: selectedTemplate.language,
            patient_ids: batchIds,
            default_tratamiento: defaultTratamiento || undefined,
            campana_id: campanaId,
          }),
        });
        const data = await batchRes.json();
        if (!batchRes.ok) {
          toast.error(`Error en batch ${batchNum}: ${data.error || "Error"}`);
          continue;
        }

        if (data.campana_id) campanaId = data.campana_id;
        allResults.push(...(data.results || []));
        totalSent += data.sent || 0;
        totalFailed += data.failed || 0;
        totalSkipped += data.skipped || 0;

        // Pausa entre batches para no saturar Meta
        if (i + BATCH_SIZE < allIds.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      setResults(allResults);
      setCostoResult(+(totalSent * 0.07).toFixed(4));
      toast.success(`Enviados: ${totalSent} | Fallidos: ${totalFailed} | Sin tel: ${totalSkipped}`);
      onSent();
    } catch {
      toast.error("Error de conexion");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select Template */}
      <div className="card-premium p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</div>
          <h3 className="text-sm font-semibold">Seleccionar plantilla</h3>
          {loadingTemplates && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        {templates.length === 0 && !loadingTemplates ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-700">No hay plantillas aprobadas. Crea y espera aprobacion en Plantillas WA.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selectedTemplate?.id === t.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <p className="text-sm font-semibold truncate">{t.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t.category} · {t.language}</p>
                {selectedTemplate?.id === t.id && (
                  <div className="flex items-center gap-1 mt-2 text-primary">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">Seleccionada</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedTemplate && templateBody && (
          <div className="mt-4">
            <button
              onClick={() => setPreviewOpen(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Vista previa del mensaje
              {previewOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {previewOpen && (
              <div className="mt-3 rounded-2xl overflow-hidden max-w-sm" style={{ backgroundColor: "#e5ddd5" }}>
                <div className="px-4 py-4">
                  <div className="flex justify-start">
                    <div className="max-w-[90%]">
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="text-[13px] text-gray-800 leading-relaxed">
                          {renderWAText(templateBody, { nombre: "Maria", tratamiento: defaultTratamiento || "tu tratamiento" })}
                        </div>
                      </div>
                      {templateButtons.map((b, i) => (
                        <div key={i} className="bg-white rounded-b-2xl border-t border-gray-100 mt-px">
                          <div className="py-2 text-center text-[13px] font-semibold text-[#128C7E]">{b.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {templateVars.includes("tratamiento") && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Tratamiento (para todos los pacientes)
                </label>
                <input
                  value={defaultTratamiento}
                  onChange={e => setDefaultTratamiento(e.target.value)}
                  placeholder="ej. Bioestimuladores, Astrodome"
                  className="input-premium max-w-md"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Select Patients */}
      <div className="card-premium p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</div>
            <h3 className="text-sm font-semibold">Seleccionar pacientes</h3>
            {loadingPatients && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {selectedCount} de {filteredPatients.length}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o telefono..."
              className="input-premium pl-9"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
              filtersOpen || activeFilterCount > 0 ? "bg-primary/5 border-primary/30 text-primary" : "border-border hover:bg-muted"
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Filtros
            {activeFilterCount > 0 && (
              <span className="w-4.5 h-4.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none">{activeFilterCount}</span>
            )}
          </button>
          <button
            onClick={handleSelectAll}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
              selectAll ? "bg-primary text-white border-primary" : "border-border hover:bg-muted"
            }`}
          >
            {selectAll ? <Check className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
            {selectAll ? "Deseleccionar" : "Seleccionar todos"}
          </button>
        </div>

        {filtersOpen && (
          <div className="mb-4 p-4 bg-muted/30 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filtros avanzados</p>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterEstado(""); setFilterSexo(""); setFilterEdadMin(""); setFilterEdadMax(""); setFilterDistrito(""); setFilterNivel(""); setFilterAtencion(""); setFilterPais(""); }}
                  className="text-[11px] text-primary font-semibold hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sexo</label>
                <select value={filterSexo} onChange={e => setFilterSexo(e.target.value)} className="input-premium w-full">
                  <option value="">Todos</option>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Edad desde</label>
                <input
                  type="number" min="0" max="120" placeholder="18"
                  value={filterEdadMin} onChange={e => setFilterEdadMin(e.target.value)}
                  className="input-premium w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Edad hasta</label>
                <input
                  type="number" min="0" max="120" placeholder="50"
                  value={filterEdadMax} onChange={e => setFilterEdadMax(e.target.value)}
                  className="input-premium w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Distrito</label>
                <select value={filterDistrito} onChange={e => setFilterDistrito(e.target.value)} className="input-premium w-full">
                  <option value="">Todos</option>
                  {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estado</label>
                <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="input-premium w-full">
                  <option value="">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="vip">VIP</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nivel paciente</label>
                <select value={filterNivel} onChange={e => setFilterNivel(e.target.value)} className="input-premium w-full">
                  <option value="">Todos</option>
                  <option value="verde">Verde</option>
                  <option value="amarillo">Amarillo</option>
                  <option value="rojo">Rojo</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nivel atencion</label>
                <select value={filterAtencion} onChange={e => setFilterAtencion(e.target.value)} className="input-premium w-full">
                  <option value="">Todos</option>
                  <option value="normal">Normal</option>
                  <option value="precaucion">Precaucion</option>
                  <option value="no_contactar">No contactar</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pais</label>
                <select value={filterPais} onChange={e => setFilterPais(e.target.value)} className="input-premium w-full">
                  <option value="">Todos</option>
                  <option value="peru">Peru (+51)</option>
                  <option value="extranjero">Extranjero</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Procedimiento realizado</label>
                <select value={filterProcedimiento} onChange={e => setFilterProcedimiento(e.target.value)} className="input-premium w-full">
                  <option value="">Todos los procedimientos</option>
                  {tratamientos.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estado renovacion</label>
                <select value={filterRenovacion} onChange={e => setFilterRenovacion(e.target.value)} className="input-premium w-full">
                  <option value="">Todos</option>
                  <option value="vencido">Vencido</option>
                  <option value="proximo">Proximo a vencer</option>
                  <option value="vigente">Vigente</option>
                  <option value="sin_renovacion">Sin renovacion</option>
                </select>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {filterSexo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    {filterSexo === "F" ? "Femenino" : "Masculino"}
                    <button onClick={() => setFilterSexo("")}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {(filterEdadMin || filterEdadMax) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    Edad: {filterEdadMin || "0"} - {filterEdadMax || "120"}
                    <button onClick={() => { setFilterEdadMin(""); setFilterEdadMax(""); }}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {filterDistrito && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    {filterDistrito}
                    <button onClick={() => setFilterDistrito("")}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {filterEstado && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    {filterEstado}
                    <button onClick={() => setFilterEstado("")}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {filterNivel && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    Nivel: {filterNivel}
                    <button onClick={() => setFilterNivel("")}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {filterAtencion && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    {filterAtencion === "no_contactar" ? "No contactar" : filterAtencion}
                    <button onClick={() => setFilterAtencion("")}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {filterPais && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    {filterPais === "peru" ? "Peru" : "Extranjero"}
                    <button onClick={() => setFilterPais("")}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {filterProcedimiento && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                    {tratamientos.find(t => t.id === filterProcedimiento)?.nombre || "Procedimiento"}
                    <button onClick={() => setFilterProcedimiento("")}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {filterRenovacion && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    filterRenovacion === "vencido" ? "bg-red-50 text-red-700 border-red-200" :
                    filterRenovacion === "proximo" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    filterRenovacion === "vigente" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    "bg-gray-50 text-gray-600 border-gray-200"
                  }`}>
                    {filterRenovacion === "vencido" ? "Vencido" : filterRenovacion === "proximo" ? "Proximo a vencer" : filterRenovacion === "vigente" ? "Vigente" : "Sin renovacion"}
                    <button onClick={() => setFilterRenovacion("")}><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="border border-border rounded-xl overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b border-border">
                  <th className="w-10 px-3 py-2.5 text-center">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-border" />
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paciente</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Edad</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Distrito</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Telefono</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Procedimientos</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Renovacion</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => togglePatient(p.id)}
                    className={`border-b border-border/50 cursor-pointer transition-colors ${
                      selectedIds.has(p.id) ? "bg-primary/5" : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => togglePatient(p.id)}
                        onClick={e => e.stopPropagation()}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{p.nombres} {p.apellidos}</p>
                      <p className="text-[10px] text-muted-foreground sm:hidden">
                        {p.sexo === "F" ? "F" : p.sexo === "M" ? "M" : ""}{calcAge(p.fecha_nacimiento) !== null ? ` · ${calcAge(p.fecha_nacimiento)} anos` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      {calcAge(p.fecha_nacimiento) !== null ? (
                        <span className="text-muted-foreground text-xs">{calcAge(p.fecha_nacimiento)} <span className="text-[10px]">{p.sexo === "F" ? "F" : p.sexo === "M" ? "M" : ""}</span></span>
                      ) : <span className="text-muted-foreground/50 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span className="text-muted-foreground text-xs">{p.distrito || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      {p.telefono ? (
                        <span className="text-muted-foreground">{p.telefono}</span>
                      ) : (
                        <span className="text-red-400 text-xs">Sin telefono</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell max-w-[200px]">
                      {enrichedData[p.id]?.procedimientos?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {enrichedData[p.id].procedimientos.slice(0, 3).map((proc, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 truncate max-w-[120px]" title={proc}>
                              {proc}
                            </span>
                          ))}
                          {enrichedData[p.id].procedimientos.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 text-gray-500">
                              +{enrichedData[p.id].procedimientos.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      {enrichedData[p.id]?.renovaciones?.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {enrichedData[p.id].renovaciones.slice(0, 2).map((r, i) => (
                            <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              r.estado === "vencido"
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : r.estado === "proximo"
                                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`} title={r.tratamiento}>
                              {r.estado === "vencido" ? `Vencido ${Math.abs(r.dias || 0)}d` :
                               r.estado === "proximo" ? `${r.dias}d` : "Vigente"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          (p.nivel_paciente || "verde") === "verde" ? "bg-emerald-500" :
                          (p.nivel_paciente || "verde") === "amarillo" ? "bg-amber-400" : "bg-red-500"
                        }`} title={`Nivel: ${p.nivel_paciente || "verde"}`} />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.estado === "vip" ? "bg-primary/10 text-primary border border-primary/20" :
                          p.estado === "activo" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}>
                          {p.estado || "activo"}
                        </span>
                        {(p.nivel_atencion === "no_contactar") && (
                          <span className="text-red-500" title="No contactar"><AlertTriangle className="w-3 h-3" /></span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPatients.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">No se encontraron pacientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Step 3: Send */}
      <div className="card-premium p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</div>
          <h3 className="text-sm font-semibold">Enviar campana</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
            <p className="text-lg font-bold text-foreground">{selectedCount}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Pacientes</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
            <p className="text-sm font-bold text-foreground truncate">{selectedTemplate?.name || "—"}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Plantilla</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
            <p className="text-lg font-bold text-foreground">${costoEstimado.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Costo est. USD</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
            <p className="text-lg font-bold text-foreground">~{Math.max(1, Math.ceil(selectedCount * 1.8 / 60))} min</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Tiempo est.</p>
          </div>
        </div>

        {selectedCount > 50 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Enviar a mas de 50 pacientes puede tomar varios minutos. Delay de 0.8s entre cada uno para evitar limites de Meta.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !selectedTemplate || selectedCount === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Enviando... ({selectedCount} mensajes)</>
          ) : (
            <><Send className="w-4 h-4" /> Enviar campana ({selectedCount} pacientes · ${costoEstimado.toFixed(2)})</>
          )}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="card-premium p-6 fade-up">
          <h3 className="text-sm font-semibold mb-4">Resultados del envio</h3>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">{results.filter(r => r.status === "sent").length} enviados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">{results.filter(r => r.status === "failed").length} fallidos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className="text-xs text-muted-foreground">{results.filter(r => r.status === "skipped").length} sin tel</span>
            </div>
            {costoResult !== null && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">${costoResult.toFixed(2)} USD</span>
              </div>
            )}
          </div>

          <div className="border border-border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80">
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Paciente</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Estado</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-3 py-2">{r.nombre}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.status === "sent" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        r.status === "failed" ? "bg-red-50 text-red-600 border border-red-200" :
                        "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}>
                        {r.status === "sent" ? "Enviado" : r.status === "failed" ? "Fallido" : "Omitido"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{r.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Historial ──────────────────────────────────────────────────────────

function TabHistorial() {
  const supabase = createClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [destinatarios, setDestinatarios] = useState<DestinatarioRow[]>([]);
  const [loadingDest, setLoadingDest] = useState(false);

  const { data: campanas, isLoading } = useQuery({
    queryKey: ["campanas_wa"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("campanas_wa")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CampanaRow[];
    },
    staleTime: 30_000,
  });

  const totalGasto = (campanas ?? []).reduce((s, c) => s + (c.costo_estimado || 0), 0);
  const totalEnviados = (campanas ?? []).reduce((s, c) => s + c.enviados, 0);

  async function loadDestinatarios(campanaId: string) {
    if (expandedId === campanaId) { setExpandedId(null); return; }
    setExpandedId(campanaId);
    setLoadingDest(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("campana_destinatarios")
        .select("id, nombre, telefono, estado, error_msg")
        .eq("campana_id", campanaId)
        .order("estado", { ascending: true });
      setDestinatarios(data || []);
    } catch { setDestinatarios([]); }
    setLoadingDest(false);
  }

  return (
    <div className="space-y-6">
      {/* Stats totales */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card-premium p-4 border-l-2 border-l-primary">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campanas</p>
          </div>
          <p className="font-serif text-3xl font-semibold text-foreground">{campanas?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">campanas enviadas</p>
        </div>
        <div className="card-premium p-4 border-l-2 border-l-emerald-400">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mensajes</p>
          </div>
          <p className="font-serif text-3xl font-semibold text-emerald-600">{totalEnviados}</p>
          <p className="text-xs text-muted-foreground mt-1">templates enviados</p>
        </div>
        <div className="card-premium p-4 border-l-2 border-l-amber-400">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gasto total</p>
          </div>
          <p className="font-serif text-3xl font-semibold text-amber-600">${totalGasto.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">USD estimado ({COSTO_UNITARIO_USD}/msg)</p>
        </div>
      </div>

      {/* Lista de campanas */}
      <div className="card-premium">
        <div className="px-4 md:px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Historial de campanas</h3>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">Cargando historial...</span>
          </div>
        )}

        {!isLoading && (!campanas || campanas.length === 0) && (
          <div className="py-16 text-center">
            <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aun no hay campanas enviadas</p>
          </div>
        )}

        {!isLoading && campanas && campanas.length > 0 && (
          <div className="divide-y divide-border/60">
            {campanas.map(c => (
              <div key={c.id}>
                <button
                  onClick={() => loadDestinatarios(c.id)}
                  className="w-full px-4 md:px-6 py-4 hover:bg-muted/20 transition-colors text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{c.nombre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatFecha(c.created_at)} · <code className="text-[10px] bg-muted px-1 rounded">{c.template_name}</code>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center gap-2 text-xs">
                        <span className="text-emerald-600 font-semibold">{c.enviados} env</span>
                        {c.fallidos > 0 && <span className="text-red-500">{c.fallidos} fall</span>}
                        {c.omitidos > 0 && <span className="text-gray-400">{c.omitidos} omit</span>}
                      </div>
                      <span className="text-xs font-bold text-primary">${(c.costo_estimado || 0).toFixed(2)}</span>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedId === c.id ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                  {/* Mobile stats */}
                  <div className="sm:hidden flex items-center gap-3 mt-2 text-xs">
                    <span className="text-emerald-600 font-semibold">{c.enviados} enviados</span>
                    {c.fallidos > 0 && <span className="text-red-500">{c.fallidos} fallidos</span>}
                    <span className="text-primary font-bold">${(c.costo_estimado || 0).toFixed(2)}</span>
                  </div>
                </button>

                {/* Expanded: destinatarios */}
                {expandedId === c.id && (
                  <div className="px-4 md:px-6 pb-4">
                    {loadingDest ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Cargando destinatarios...
                      </div>
                    ) : (
                      <div className="border border-border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-muted/80">
                            <tr className="border-b border-border">
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Paciente</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Telefono</th>
                              <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Estado</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {destinatarios.map(d => (
                              <tr key={d.id} className="border-b border-border/50">
                                <td className="px-3 py-2 font-medium">{d.nombre}</td>
                                <td className="px-3 py-2 hidden sm:table-cell">
                                  {d.telefono ? (
                                    <a
                                      href={`https://wa.me/${d.telefono.replace(/\D/g, "")}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="text-emerald-600 hover:underline flex items-center gap-1"
                                    >
                                      <Phone className="w-3 h-3" />{d.telefono}
                                    </a>
                                  ) : "—"}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    d.estado === "enviado" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                    d.estado === "fallido" ? "bg-red-50 text-red-600 border border-red-200" :
                                    "bg-gray-100 text-gray-500 border border-gray-200"
                                  }`}>
                                    {d.estado}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-xs text-red-500 truncate max-w-[200px] hidden md:table-cell" title={d.error_msg || ""}>
                                  {d.error_msg || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function CampanasPage() {
  const [tab, setTab] = useState<Tab>("nueva");
  const queryClient = useQueryClient();

  function handleCampaignSent() {
    queryClient.invalidateQueries({ queryKey: ["campanas_wa"] });
  }

  return (
    <RoleGuard allowed={["admin", "doctor", "recepcion"]}>
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2.5">
            <Megaphone className="w-4 h-4 text-primary/60" />
            <span className="font-serif text-sm md:text-base font-semibold">Campanas WhatsApp</span>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-5xl mx-auto space-y-6">
        <div className="fade-up">
          <p className="label-elegant mb-1.5">Marketing</p>
          <h2 className="font-serif text-xl md:text-2xl font-semibold">Campanas de Remarketing</h2>
          <p className="text-sm text-muted-foreground mt-1">Envia plantillas personalizadas a tus pacientes y lleva control del gasto</p>
          <div className="gold-rule mt-4" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit fade-up stagger-1">
          <button
            onClick={() => setTab("nueva")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "nueva" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Nueva campana
          </button>
          <button
            onClick={() => setTab("historial")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "historial" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="w-3.5 h-3.5" /> Historial & costos
          </button>
        </div>

        <div className="fade-up stagger-2">
          {tab === "nueva" ? <TabNuevaCampana onSent={handleCampaignSent} /> : <TabHistorial />}
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
