"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Megaphone, Send, Loader2, RefreshCw, Users, CheckCircle2,
  AlertTriangle, Filter, ChevronDown, ChevronUp, Search, X,
  Smartphone, Check,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

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
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  estado: string;
};

type Procedimiento = {
  id: string;
  nombre: string;
};

type SendResult = {
  id: string;
  nombre: string;
  status: string;
  error?: string;
};

// ── WA Preview ───────────────────────────────────────────────────────────────
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

export default function CampanasPage() {
  const supabase = createClient();

  // Data
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Selection
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProcedimiento, setFilterProcedimiento] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Send
  const [defaultTratamiento, setDefaultTratamiento] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[] | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/staff/api/templates");
      const data = await res.json();
      setTemplates((data.templates ?? []).filter((t: MetaTemplate) => t.status === "APPROVED"));
    } catch { /* ignore */ }
    setLoadingTemplates(false);
  }, []);

  // Fetch patients
  const fetchPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const { data } = await (supabase as any)
        .from("pacientes")
        .select("id, nombre, apellido, telefono, email, estado")
        .order("nombre", { ascending: true });
      setPatients(data || []);
    } catch { /* ignore */ }
    setLoadingPatients(false);
  }, [supabase]);

  // Fetch procedimientos for filter
  const fetchProcedimientos = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("tratamientos_catalogo")
        .select("id, nombre")
        .order("nombre", { ascending: true });
      setProcedimientos(data || []);
    } catch { /* ignore */ }
  }, [supabase]);

  useEffect(() => {
    fetchTemplates();
    fetchPatients();
    fetchProcedimientos();
  }, [fetchTemplates, fetchPatients, fetchProcedimientos]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    let list = patients;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.nombre?.toLowerCase().includes(q) ||
        p.apellido?.toLowerCase().includes(q) ||
        p.telefono?.includes(q)
      );
    }
    if (filterEstado) {
      list = list.filter(p => p.estado === filterEstado);
    }
    return list;
  }, [patients, searchQuery, filterEstado]);

  // Select all toggle
  useEffect(() => {
    if (selectAll) {
      setSelectedIds(new Set(filteredPatients.map(p => p.id)));
    }
  }, [selectAll, filteredPatients]);

  function togglePatient(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectAll(false);
  }

  function handleSelectAll() {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(filteredPatients.map(p => p.id)));
      setSelectAll(true);
    }
  }

  // Get body text from template
  const templateBody = selectedTemplate?.components?.find(c => c.type === "BODY")?.text || "";
  const templateButtons = selectedTemplate?.components?.find(c => c.type === "BUTTONS")?.buttons || [];
  const templateVars = [...new Set([...(templateBody.matchAll(/\{\{([a-zA-Z_]+)\}\}/g) || [])].map(m => m[1]))];

  // Send campaign
  async function handleSend() {
    if (!selectedTemplate) {
      toast.error("Selecciona una plantilla");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("Selecciona al menos un paciente");
      return;
    }

    const confirmMsg = `Enviar "${selectedTemplate.name}" a ${selectedIds.size} paciente${selectedIds.size > 1 ? "s" : ""}?`;
    if (!confirm(confirmMsg)) return;

    setSending(true);
    setResults(null);

    try {
      const res = await fetch("/staff/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_name: selectedTemplate.name,
          template_language: selectedTemplate.language,
          patient_ids: [...selectedIds],
          default_tratamiento: defaultTratamiento || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al enviar");
        return;
      }

      setResults(data.results);
      toast.success(`Enviados: ${data.sent} | Fallidos: ${data.failed} | Sin telefono: ${data.skipped}`);
    } catch {
      toast.error("Error de conexion");
    } finally {
      setSending(false);
    }
  }

  const patientsWithPhone = filteredPatients.filter(p => p.telefono);
  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2.5">
            <Megaphone className="w-4 h-4 text-primary/60" />
            <span className="font-serif text-sm md:text-base font-semibold">Campanas WhatsApp</span>
          </div>
          <button
            onClick={() => { fetchTemplates(); fetchPatients(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 border border-border transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-5xl mx-auto space-y-6">
        {/* Title */}
        <div className="fade-up">
          <p className="label-elegant mb-1.5">Marketing</p>
          <h2 className="font-serif text-xl md:text-2xl font-semibold">Campanas de WhatsApp</h2>
          <p className="text-sm text-muted-foreground mt-1">Envia plantillas aprobadas a tus pacientes de forma masiva</p>
          <div className="gold-rule mt-4" />
        </div>

        {/* Step 1: Select Template */}
        <div className="card-premium p-6 fade-up stagger-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</div>
            <h3 className="text-sm font-semibold">Seleccionar plantilla</h3>
            {loadingTemplates && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {templates.length === 0 && !loadingTemplates ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-700">No hay plantillas aprobadas. Crea y espera aprobacion en la seccion Plantillas WA.</p>
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

          {/* Template preview */}
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

              {/* Default tratamiento param */}
              {templateVars.includes("tratamiento") && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Tratamiento (para todos los pacientes)
                  </label>
                  <input
                    value={defaultTratamiento}
                    onChange={e => setDefaultTratamiento(e.target.value)}
                    placeholder="ej. Bioestimuladores, Astrodome"
                    className="w-full max-w-md px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Select Patients */}
        <div className="card-premium p-6 fade-up stagger-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</div>
              <h3 className="text-sm font-semibold">Seleccionar pacientes</h3>
              {loadingPatients && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {selectedCount} de {filteredPatients.length} seleccionados
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o telefono..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
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
                filtersOpen ? "bg-primary/5 border-primary/30 text-primary" : "border-border hover:bg-muted"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filtros
              {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              onClick={handleSelectAll}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                selectAll ? "bg-primary text-white border-primary" : "border-border hover:bg-muted"
              }`}
            >
              {selectAll ? <Check className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              {selectAll ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
          </div>

          {filtersOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-muted/30 rounded-xl border border-border">
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estado</label>
                <select
                  value={filterEstado}
                  onChange={e => setFilterEstado(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-white focus:outline-none"
                >
                  <option value="">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pacientes</label>
                <p className="text-xs text-muted-foreground mt-1">
                  {patientsWithPhone.length} con telefono de {filteredPatients.length} total
                </p>
              </div>
            </div>
          )}

          {/* Patient list */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b border-border">
                    <th className="w-10 px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-border"
                      />
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paciente</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Telefono</th>
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
                        <p className="font-medium">{p.nombre} {p.apellido}</p>
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        {p.telefono ? (
                          <span className="text-muted-foreground">{p.telefono}</span>
                        ) : (
                          <span className="text-red-400 text-xs">Sin telefono</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.estado === "activo" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}>
                          {p.estado || "activo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No se encontraron pacientes
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Step 3: Send */}
        <div className="card-premium p-6 fade-up stagger-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</div>
            <h3 className="text-sm font-semibold">Enviar campana</h3>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
              <p className="text-lg font-bold text-foreground">{selectedCount}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Pacientes</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
              <p className="text-lg font-bold text-foreground">{selectedTemplate?.name || "—"}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Plantilla</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
              <p className="text-lg font-bold text-foreground">~{Math.ceil(selectedCount * 0.8 / 60)} min</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Tiempo est.</p>
            </div>
          </div>

          {/* Warning */}
          {selectedCount > 50 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Enviar a mas de 50 pacientes puede tomar varios minutos. Los mensajes se envian con delay de 0.8s entre cada uno para evitar limites de Meta.
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
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando... ({selectedCount} mensajes)
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar campana ({selectedCount} pacientes)
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="card-premium p-6 fade-up">
            <h3 className="text-sm font-semibold mb-4">Resultados del envio</h3>
            <div className="flex gap-4 mb-4">
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
                <span className="text-xs text-muted-foreground">{results.filter(r => r.status === "skipped").length} sin telefono</span>
              </div>
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
    </div>
  );
}
