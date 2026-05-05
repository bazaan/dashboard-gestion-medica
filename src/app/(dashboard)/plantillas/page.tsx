"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquareText, Copy, Check, ChevronDown, ChevronUp,
  Info, Clock, AlertTriangle, CheckCircle2, Smartphone,
  Plus, Trash2, RefreshCw, Send, Loader2, X,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────
type MetaTemplate = {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: { type: string; text?: string; buttons?: { type: string; text: string }[] }[];
};

// ── Renderer del texto de WhatsApp ──────────────────────────────────────────
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
      const varMatch = remaining.match(/^(\{\{[a-zA-Z_]+\}\})/);

      if (boldMatch) {
        parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
      } else if (italicMatch) {
        parts.push(<em key={key++} className="italic text-[11px] opacity-80">{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
      } else if (varMatch) {
        parts.push(<span key={key++} className="bg-primary/20 text-primary px-0.5 rounded font-mono text-[11px]">{varMatch[1]}</span>);
        remaining = remaining.slice(varMatch[0].length);
      } else {
        const next = remaining.search(/[*_]|\{\{[a-zA-Z_]+\}\}/);
        if (next === -1) { parts.push(<span key={key++}>{remaining}</span>); remaining = ""; }
        else { parts.push(<span key={key++}>{remaining.slice(0, next)}</span>); remaining = remaining.slice(next); }
      }
    }

    return <p key={li} className={li === 0 ? "" : "mt-1"}>{parts}</p>;
  });
}

function highlightVars(text: string) {
  return text.split("\n").map((line, li) => {
    const parts = line.split(/(\{\{[a-zA-Z_]+\}\})/);
    return (
      <p key={li} className={li === 0 ? "" : "mt-1"}>
        {parts.map((part, pi) =>
          /^\{\{[a-zA-Z_]+\}\}$/.test(part)
            ? <span key={pi} className="inline-block bg-primary/15 text-primary font-mono text-[11px] px-1 py-0.5 rounded border border-primary/25">{part}</span>
            : <span key={pi}>{part}</span>
        )}
      </p>
    );
  });
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const styles: Record<string, string> = {
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-600 border-amber-200",
    REJECTED: "bg-red-50 text-red-600 border-red-200",
    DISABLED: "bg-gray-100 text-gray-500 border-gray-200",
  };
  const labels: Record<string, string> = {
    APPROVED: "Aprobada",
    PENDING: "Pendiente",
    REJECTED: "Rechazada",
    DISABLED: "Deshabilitada",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[s] || styles.DISABLED}`}>
      {labels[s] || s}
    </span>
  );
}

// ── Template Card (from Meta) ────────────────────────────────────────────────
function TemplateCard({ t, onDelete, deleting }: { t: MetaTemplate; onDelete: () => void; deleting: boolean }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const bodyComp = t.components?.find(c => c.type === "BODY");
  const buttonsComp = t.components?.find(c => c.type === "BUTTONS");
  const bodyText = bodyComp?.text || "";

  // Extract variable names from body
  const varNames = [...bodyText.matchAll(/\{\{(\d+)\}\}/g)].map((_, i) => `param_${i + 1}`);
  const namedVars = [...bodyText.matchAll(/\{\{([a-zA-Z_]+)\}\}/g)].map(m => m[1]);
  const allVars = namedVars.length > 0 ? namedVars : varNames;

  const [vars, setVars] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    allVars.forEach(name => {
      if (name === "nombre") v[name] = "Maria Garcia";
      else if (name === "tratamiento") v[name] = "Hilos Delta Lifting";
      else v[name] = `valor_${name}`;
    });
    return v;
  });

  function copyText() {
    navigator.clipboard.writeText(bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const iconMap: Record<string, { Icon: typeof CheckCircle2; color: string; colorIcon: string }> = {
    APPROVED: { Icon: CheckCircle2, color: "bg-emerald-50 border-emerald-200", colorIcon: "text-emerald-500" },
    PENDING: { Icon: Clock, color: "bg-amber-50 border-amber-200", colorIcon: "text-amber-500" },
    REJECTED: { Icon: AlertTriangle, color: "bg-red-50 border-red-200", colorIcon: "text-red-500" },
  };
  const { Icon, color, colorIcon } = iconMap[t.status] || iconMap.PENDING;

  return (
    <div className="card-premium overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${color} shrink-0`}>
              <Icon className={`w-4.5 h-4.5 ${colorIcon}`} />
            </div>
            <div>
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.category} · {t.language}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={t.status} />
            <button
              onClick={onDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
              title="Eliminar plantilla"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {buttonsComp.buttons.map((b, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                {b.type} · {b.text}
              </span>
            ))}
          </div>
        )}
      </div>

      {bodyText && (
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Texto</p>
            <button
              onClick={copyText}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                copied ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-muted hover:bg-muted/80 text-foreground border border-border"
              }`}
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
            </button>
          </div>
          <div className="bg-muted/40 border border-border rounded-xl p-4 text-sm leading-relaxed font-mono text-[13px]">
            {highlightVars(bodyText)}
          </div>
        </div>
      )}

      {bodyText && (
        <div className="border-t border-border">
          <button
            onClick={() => setPreviewOpen(v => !v)}
            className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-muted/20 transition-colors text-left"
          >
            <Smartphone className="w-4 h-4 text-primary/60 shrink-0" />
            <span className="flex-1 text-sm font-medium">Previsualizar</span>
            {previewOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {previewOpen && (
            <div className="px-6 pb-6 pt-2 border-t border-border/60">
              {allVars.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {allVars.map(name => (
                    <div key={name}>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{`{{${name}}}`}</label>
                      <input
                        value={vars[name] || ""}
                        onChange={e => setVars(v => ({ ...v, [name]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#e5ddd5" }}>
                <div className="px-4 py-5">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-black/10">
                    <div className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center text-white text-xs font-bold shrink-0">D</div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Clinica Dra. Dennisse</p>
                      <p className="text-[10px] text-gray-500">WhatsApp Business</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] shadow-sm" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.12))" }}>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="text-[13px] text-gray-800 leading-relaxed">
                          {renderWAText(bodyText, vars)}
                        </div>
                        <p className="text-[10px] text-gray-400 text-right mt-2">
                          {new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {buttonsComp?.buttons?.map((b, i) => (
                        <div key={i} className="bg-white rounded-b-2xl border-t border-gray-100 overflow-hidden mt-px">
                          <button type="button" className="w-full py-2.5 text-center text-[13px] font-semibold text-[#128C7E]">
                            {b.text}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Create Template Dialog ───────────────────────────────────────────────────
function CrearPlantillaDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("es_PE");
  const [bodyText, setBodyText] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});

  // Extract variables from body text
  const variables = [...(bodyText.matchAll(/\{\{([a-zA-Z_]+)\}\}/g) || [])].map(m => m[1]);
  const uniqueVars = [...new Set(variables)];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !bodyText.trim()) {
      toast.error("Nombre y texto son obligatorios");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(name)) {
      toast.error("El nombre solo puede contener letras minusculas, numeros y guiones bajos");
      return;
    }

    setLoading(true);
    try {
      const buttons = buttonText.trim() ? [{ type: "QUICK_REPLY", text: buttonText.trim() }] : [];
      const res = await fetch("/staff/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, language, body_text: bodyText, buttons }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al crear plantilla");
        return;
      }
      toast.success(`Plantilla "${name}" enviada a Meta para aprobacion`);
      onCreated();
      onClose();
      setName(""); setBodyText(""); setButtonText("");
    } catch {
      toast.error("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-primary" />
            <span className="font-serif text-base font-semibold">Nueva Plantilla de WhatsApp</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name, Category, Language */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Nombre (solo a-z, 0-9, _)
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="ej. bienvenida_paciente"
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white"
              >
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utility</option>
                <option value="AUTHENTICATION">Authentication</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Idioma</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white"
              >
                <option value="es_PE">Espanol (Peru)</option>
                <option value="es">Espanol</option>
                <option value="es_419">Espanol (Latam)</option>
                <option value="en_US">English (US)</option>
              </select>
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Texto del mensaje
            </label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Usa {"{{nombre}}"}, {"{{tratamiento}}"} o cualquier {"{{variable}}"} para parametros dinamicos. Usa *texto* para negrita y _texto_ para cursiva.
            </p>
            <textarea
              value={bodyText}
              onChange={e => setBodyText(e.target.value)}
              rows={8}
              placeholder={`Hola {{nombre}} \n\nTe recordamos tu cita de *{{tratamiento}}* en nuestra clinica.\n\n_Responde STOP para no recibir mas mensajes._`}
              className="w-full px-4 py-3 rounded-xl border border-border text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 resize-y"
            />
            {uniqueVars.length > 0 && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-semibold">Variables detectadas:</span>
                {uniqueVars.map(v => (
                  <span key={v} className="bg-primary/15 text-primary font-mono text-[10px] px-1.5 py-0.5 rounded border border-primary/25">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Button */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Boton Quick Reply (opcional)
            </label>
            <input
              value={buttonText}
              onChange={e => setButtonText(e.target.value)}
              placeholder='ej. Quiero agendar mi cita'
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>

          {/* Preview */}
          {bodyText.trim() && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vista previa</p>
              {uniqueVars.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {uniqueVars.map(v => (
                    <input
                      key={v}
                      value={previewVars[v] || ""}
                      onChange={e => setPreviewVars(prev => ({ ...prev, [v]: e.target.value }))}
                      placeholder={`{{${v}}}`}
                      className="px-2 py-1.5 rounded-lg border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  ))}
                </div>
              )}
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#e5ddd5" }}>
                <div className="px-4 py-4">
                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="text-[13px] text-gray-800 leading-relaxed">
                          {renderWAText(bodyText, previewVars)}
                        </div>
                      </div>
                      {buttonText.trim() && (
                        <div className="bg-white rounded-b-2xl border-t border-gray-100 mt-px">
                          <div className="py-2.5 text-center text-[13px] font-semibold text-[#128C7E]">{buttonText}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !bodyText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar a Meta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PlantillasPage() {
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/staff/api/templates");
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch {
      toast.error("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  async function handleDelete(name: string) {
    if (!confirm(`Eliminar plantilla "${name}"? Esta accion no se puede deshacer.`)) return;
    setDeletingName(name);
    try {
      const res = await fetch("/staff/api/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al eliminar");
        return;
      }
      toast.success(`Plantilla "${name}" eliminada`);
      fetchTemplates();
    } catch {
      toast.error("Error de conexion");
    } finally {
      setDeletingName(null);
    }
  }

  const approved = templates.filter(t => t.status === "APPROVED");
  const pending = templates.filter(t => t.status === "PENDING");
  const rejected = templates.filter(t => t.status === "REJECTED");
  const other = templates.filter(t => !["APPROVED", "PENDING", "REJECTED"].includes(t.status));

  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2.5">
            <MessageSquareText className="w-4 h-4 text-primary/60" />
            <span className="font-serif text-sm md:text-base font-semibold">Plantillas de WhatsApp</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTemplates}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 border border-border transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Plantilla
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto space-y-6">
        <div className="fade-up">
          <p className="label-elegant mb-1.5">Meta Business Manager</p>
          <div className="flex items-end justify-between flex-wrap gap-2">
            <h2 className="font-serif text-xl md:text-2xl font-semibold">Plantillas de WhatsApp</h2>
            <p className="text-sm text-muted-foreground">
              {templates.length} plantilla{templates.length !== 1 ? "s" : ""} ·{" "}
              <span className="text-emerald-600 font-semibold">{approved.length} aprobada{approved.length !== 1 ? "s" : ""}</span> ·{" "}
              <span className="text-amber-600 font-semibold">{pending.length} pendiente{pending.length !== 1 ? "s" : ""}</span>
              {rejected.length > 0 && <> · <span className="text-red-600 font-semibold">{rejected.length} rechazada{rejected.length !== 1 ? "s" : ""}</span></>}
            </p>
          </div>
          <div className="gold-rule mt-4" />
        </div>

        {loading && templates.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
            <span className="ml-3 text-sm text-muted-foreground">Cargando plantillas desde Meta...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="card-premium p-8 text-center">
            <MessageSquareText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay plantillas creadas aun</p>
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear primera plantilla
            </button>
          </div>
        ) : (
          <div className="space-y-5 fade-up stagger-1">
            {/* Info box */}
            <div className="card-premium p-4 border-l-4 border-l-primary/40">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p>Las plantillas se envian a <strong>Meta</strong> para revision. El proceso toma 24-48 horas. Una vez aprobadas, se pueden usar para enviar mensajes masivos via WhatsApp Business API.</p>
                  <p className="mt-1">Usa variables como <code className="bg-muted px-1 rounded">{"{{nombre}}"}</code> para personalizar mensajes. Solo letras minusculas, numeros y guiones bajos en el nombre.</p>
                </div>
              </div>
            </div>

            {[...approved, ...pending, ...rejected, ...other].map(t => (
              <TemplateCard
                key={t.id}
                t={t}
                onDelete={() => handleDelete(t.name)}
                deleting={deletingName === t.name}
              />
            ))}
          </div>
        )}
      </div>

      <CrearPlantillaDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchTemplates}
      />
    </div>
  );
}
