"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText, Plus, Upload, Trash2, X, ChevronDown, ChevronUp,
  Stethoscope, Loader2, Lock, File as FileIcon,
  Edit3, Eye, Download, Syringe, ClipboardList,
  Pill, MessageSquare, CalendarClock, CheckCheck, Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { HistoriaClinica, EvolucionClinica } from "@/types/database.types";

// ─────────────────────────────────────────────────────────────────────────────
const TIPO_PIEL_LABELS: Record<string, string> = {
  seca: "Seca", grasa: "Grasa", mixta: "Mixta",
  normal: "Normal", sensible: "Sensible",
};

const FITZPATRICK_LABELS: Record<number, string> = {
  1: "I — Siempre se quema", 2: "II — Casi siempre", 3: "III — A veces",
  4: "IV — Raramente", 5: "V — Muy raramente", 6: "VI — Nunca",
};

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
        .select(`
          *,
          procedimientos_consulta(
            id,
            tratamientos_catalogo(nombre, categoria)
          )
        `)
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

// ─────────────────────────────────────────────────────────────────────────────
// Crear Historia Clínica
// ─────────────────────────────────────────────────────────────────────────────
function CrearHistoriaCard({ pacienteId, onCreated }: { pacienteId: string; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ motivo: "", antecedentes: "", expectativas: "", tipo_piel: "", fototipo: "" });

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
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success("Historia clínica creada");
    onCreated();
  }

  const cls = "w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60";

  return (
    <div className="card-premium p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-primary/8 border border-primary/15 flex items-center justify-center mx-auto mb-4">
          <Stethoscope className="w-7 h-7 text-primary/50" />
        </div>
        <h4 className="font-serif text-xl font-semibold mb-1">Abrir Historia Clínica</h4>
        <p className="text-sm text-muted-foreground">Datos iniciales del paciente</p>
      </div>
      <form onSubmit={handleCreate} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Motivo de consulta inicial <span className="text-red-400">*</span>
          </label>
          <textarea rows={3} value={form.motivo}
            onChange={(e) => setForm(p => ({ ...p, motivo: e.target.value }))}
            placeholder="¿Por qué acude el paciente? ¿Qué área desea mejorar?"
            className={cls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tipo de piel</label>
            <select value={form.tipo_piel} onChange={(e) => setForm(p => ({ ...p, tipo_piel: e.target.value }))} className={cls}>
              <option value="">Seleccionar…</option>
              {Object.entries(TIPO_PIEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Fototipo Fitzpatrick</label>
            <select value={form.fototipo} onChange={(e) => setForm(p => ({ ...p, fototipo: e.target.value }))} className={cls}>
              <option value="">Seleccionar…</option>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Tipo {n}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Antecedentes estéticos previos</label>
          <textarea rows={2} value={form.antecedentes}
            onChange={(e) => setForm(p => ({ ...p, antecedentes: e.target.value }))}
            placeholder="Tratamientos previos, cirugías, rellenos, botox…" className={cls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Expectativas del paciente</label>
          <textarea rows={2} value={form.expectativas}
            onChange={(e) => setForm(p => ({ ...p, expectativas: e.target.value }))}
            placeholder="¿Qué resultado espera obtener?" className={cls} />
        </div>
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
// Historia Base Card
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
              {historia.condiciones_piel.map((c) => (
                <span key={c} className="px-2.5 py-1 bg-primary/8 border border-primary/15 text-primary text-xs rounded-full font-medium">{c}</span>
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
// Card de Evolución (mejorada)
// ─────────────────────────────────────────────────────────────────────────────
function EvolucionCard({ evolucion, defaultOpen = false }: { evolucion: EvolucionConProcs; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);

  const procsDelCatalogo = (evolucion.procedimientos_consulta ?? [])
    .filter((p) => p.tratamientos_catalogo)
    .map((p) => p.tratamientos_catalogo!.nombre);

  const fechaFormatted = format(new Date(evolucion.fecha_atencion), "d 'de' MMMM yyyy", { locale: es });
  const horaFormatted  = format(new Date(evolucion.fecha_atencion), "HH:mm", { locale: es });

  return (
    <div className="card-premium overflow-hidden">
      {/* Header clickable */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left group"
      >
        {/* Dot del timeline */}
        <div className="shrink-0 flex flex-col items-center gap-1 pt-1">
          <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary/30" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Fecha + hora */}
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
              {expanded
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>

          {/* Procedimientos del catálogo (más importante) */}
          {procsDelCatalogo.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {procsDelCatalogo.map((nombre) => (
                <span key={nombre} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-semibold">
                  <Syringe className="w-2.5 h-2.5" />{nombre}
                </span>
              ))}
            </div>
          )}

          {/* Motivo o procedimiento libre */}
          {(evolucion.motivo_consulta || evolucion.procedimiento) && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {evolucion.motivo_consulta || evolucion.procedimiento}
            </p>
          )}

          {/* Zonas tratadas */}
          {evolucion.zona_tratada && evolucion.zona_tratada.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {evolucion.zona_tratada.map((z) => (
                <span key={z} className="px-1.5 py-0.5 bg-muted border border-border/80 text-muted-foreground text-[10px] rounded font-medium">
                  {z}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* Detalle expandido */}
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

                {/* Procedimiento libre (si no está en catálogo) */}
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

                {/* Productos */}
                {evolucion.productos_usados && evolucion.productos_usados.length > 0 && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Pill className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Productos utilizados</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {evolucion.productos_usados.map((p) => (
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
// Sección de Documentos
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
    accept: { "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png", ".webp"], "application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
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
            {(archivos as StorageFile[]).map((file) => (
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
          <HistoriaBaseCard historia={historia} />
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
            /* Timeline con línea vertical */
            <div className="relative">
              {/* Línea vertical del timeline */}
              <div className="absolute left-[18px] top-5 bottom-5 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

              <div className="space-y-2 pl-1">
                {evoluciones.map((ev, i) => (
                  <EvolucionCard
                    key={ev.id}
                    evolucion={ev}
                    defaultOpen={i === 0}
                  />
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
