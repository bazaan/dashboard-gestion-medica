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
  const [filtersOpen, setFiltersOpen] = useState(false);

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
        .select("id, nombres, apellidos, telefono, estado")
        .order("nombres", { ascending: true });
      setPatients(data || []);
    } catch { /* ignore */ }
    setLoadingPatients(false);
  }, [supabase]);

  useEffect(() => {
    fetchTemplates();
    fetchPatients();
  }, [fetchTemplates, fetchPatients]);

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
    return list;
  }, [patients, searchQuery, filterEstado]);

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
      if (!res.ok) { toast.error(data.error || "Error al enviar"); return; }

      setResults(data.results);
      setCostoResult(data.costo_estimado_usd);
      toast.success(`Enviados: ${data.sent} | Fallidos: ${data.failed} | Sin tel: ${data.skipped}`);
      onSent(); // refresh history
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
              filtersOpen ? "bg-primary/5 border-primary/30 text-primary" : "border-border hover:bg-muted"
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Filtros
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
          <div className="mb-4 p-3 bg-muted/30 rounded-xl border border-border">
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estado</label>
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
              className="input-premium max-w-[200px]"
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
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
                      <p className="font-medium">{p.nombres} {p.apellidos}</p>
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
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">No se encontraron pacientes</td></tr>
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
    <RoleGuard allowed={["admin", "doctor"]}>
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
