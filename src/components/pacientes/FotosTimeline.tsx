"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera, Upload, SplitSquareHorizontal, X, ZoomIn, Trash2,
  ImageOff, ChevronDown, Maximize2,
} from "lucide-react";
import { useFotos, useDeleteFoto, agruparPorMes, type FotoConUrl } from "@/lib/hooks/useFotos";
import { SubirFotoDrawer } from "./SubirFotoDrawer";
import { ComparadorSlider } from "./ComparadorSlider";
import { CinematicReveal } from "./CinematicReveal";

interface Props {
  pacienteId: string;
  pacienteNombre: string;
}

const TIPO_CONFIG = {
  antes: { label: "Antes", bg: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-400" },
  despues: { label: "Después", bg: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  seguimiento: { label: "Seguimiento", bg: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-400" },
};

const MESES_ES: Record<string, string> = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
  "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
  "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal cinematográfico de comparación Antes / Después
// ─────────────────────────────────────────────────────────────────────────────
interface ComparadorModalProps {
  par: { antes: FotoConUrl; despues: FotoConUrl };
  pacienteNombre: string;
  onClose: () => void;
}

function ComparadorModal({ par, pacienteNombre, onClose }: ComparadorModalProps) {
  const fechaAntes = format(new Date(par.antes.fecha_foto), "d MMM yyyy", { locale: es });
  const fechaDespues = format(new Date(par.despues.fecha_foto), "d MMM yyyy", { locale: es });
  const mismaFecha = par.antes.fecha_foto === par.despues.fecha_foto;

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      onClick={onClose}
    >
      {/* Fondo oscuro con gradiente cinematográfico */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(30,20,10,0.97) 0%, rgba(5,5,5,0.99) 100%)",
        }}
      />

      {/* Partículas decorativas (líneas doradas sutiles) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(169,141,103,0.3), transparent)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(169,141,103,0.3), transparent)",
          }}
        />
      </div>

      {/* Contenido del modal */}
      <motion.div
        className="relative w-full max-w-4xl mx-4 flex flex-col items-center gap-6"
        initial={{ scale: 0.94, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="w-full flex items-start justify-between px-1">
          <div className="space-y-1">
            {/* Eyebrow label */}
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "rgba(169,141,103,0.7)" }}
            >
              Comparación Antes · Después
            </p>
            {/* Nombre del paciente */}
            <h2
              className="font-serif text-2xl font-semibold"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              {pacienteNombre}
            </h2>
            {/* Fechas */}
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              {mismaFecha ? (
                <>{fechaAntes}</>
              ) : (
                <>
                  <span style={{ color: "rgba(147,197,253,0.6)" }}>{fechaAntes}</span>
                  {" · "}
                  <span style={{ color: "rgba(134,239,172,0.6)" }}>{fechaDespues}</span>
                </>
              )}
              {par.antes.angulo && (
                <span className="capitalize ml-2" style={{ color: "rgba(169,141,103,0.5)" }}>
                  · {par.antes.angulo.replace("_", " ")}
                </span>
              )}
              {par.antes.zona && (
                <span className="ml-1" style={{ color: "rgba(169,141,103,0.5)" }}>
                  · {par.antes.zona}
                </span>
              )}
            </p>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
            }}
          >
            <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
          </button>
        </div>

        {/* Línea decorativa dorada */}
        <div
          className="w-full h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(169,141,103,0.4) 20%, rgba(169,141,103,0.4) 80%, transparent)",
          }}
        />

        {/* Slider cinematográfico */}
        {par.antes.url && par.despues.url ? (
          <div className="w-full">
            <ComparadorSlider
              urlAntes={par.antes.url}
              urlDespues={par.despues.url}
              autoPlay
            />
          </div>
        ) : (
          <div
            className="w-full aspect-[4/3] rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              Las URLs de imagen han expirado. Recarga la página.
            </p>
          </div>
        )}

        {/* Footer con descripciones */}
        {(par.antes.descripcion || par.despues.descripcion) && (
          <div className="w-full grid grid-cols-2 gap-4">
            {par.antes.descripcion && (
              <div
                className="px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(147,197,253,0.05)",
                  border: "1px solid rgba(147,197,253,0.1)",
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "rgba(147,197,253,0.5)" }}
                >
                  Antes
                </p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {par.antes.descripcion}
                </p>
              </div>
            )}
            {par.despues.descripcion && (
              <div
                className="px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(134,239,172,0.05)",
                  border: "1px solid rgba(134,239,172,0.1)",
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "rgba(134,239,172,0.5)" }}
                >
                  Después
                </p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {par.despues.descripcion}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instrucción de cierre */}
        <p
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{ color: "rgba(255,255,255,0.18)" }}
        >
          Haz clic fuera para cerrar
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox simple para foto individual
// ─────────────────────────────────────────────────────────────────────────────
function LightboxModal({ foto, onClose, onDelete }: {
  foto: FotoConUrl; onClose: () => void; onDelete: (id: string, path: string) => void;
}) {
  const config = TIPO_CONFIG[foto.tipo];
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-background rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                {config.label}
              </span>
              {foto.angulo && <span className="text-xs text-muted-foreground capitalize">{foto.angulo.replace("_", " ")}</span>}
              {foto.zona && <span className="text-xs text-muted-foreground">· {foto.zona}</span>}
              <span className="text-xs text-muted-foreground">
                · {format(new Date(foto.fecha_foto), "d MMM yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { onDelete(foto.id, foto.storage_path); onClose(); }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-all"
                title="Eliminar foto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="bg-black flex items-center justify-center" style={{ maxHeight: "70vh" }}>
            {foto.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto.url} alt={config.label} className="max-h-full max-w-full object-contain" style={{ maxHeight: "70vh" }} />
            ) : (
              <div className="flex items-center justify-center h-64 text-white/40">
                <ImageOff className="w-12 h-12" />
              </div>
            )}
          </div>
          {foto.descripcion && (
            <div className="px-5 py-3 bg-muted/30 border-t border-border">
              <p className="text-sm text-muted-foreground">{foto.descripcion}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tarjeta de foto individual en el grid
// ─────────────────────────────────────────────────────────────────────────────
function FotoCard({ foto, onClick }: { foto: FotoConUrl; onClick: () => void }) {
  const config = TIPO_CONFIG[foto.tipo];
  return (
    <div
      onClick={onClick}
      className="group relative aspect-square rounded-xl overflow-hidden border border-border cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
    >
      {foto.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto.url} alt={config.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <Camera className="w-8 h-8 text-muted-foreground/40" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${config.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </div>
      <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity">
        <ZoomIn className="w-3.5 h-3.5" />
      </div>
      {foto.angulo && (
        <div className="absolute bottom-2 left-2 text-xs text-white/80 font-medium opacity-0 group-hover:opacity-100 transition-opacity capitalize">
          {foto.angulo.replace("_", " ")}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export function FotosTimeline({ pacienteId, pacienteNombre }: Props) {
  const { data: fotos = [], isLoading, error } = useFotos(pacienteId);
  const { mutate: deleteFoto } = useDeleteFoto();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightbox, setLightbox] = useState<FotoConUrl | null>(null);
  const [comparadorPar, setComparadorPar] = useState<{ antes: FotoConUrl; despues: FotoConUrl } | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const grupos = agruparPorMes(fotos);

  function findPares(fotosDelGrupo: FotoConUrl[]) {
    const antes = fotosDelGrupo.filter((f) => f.tipo === "antes");
    const despues = fotosDelGrupo.filter((f) => f.tipo === "despues");
    if (antes.length > 0 && despues.length > 0) {
      return { antes: antes[0], despues: despues[0] };
    }
    return null;
  }

  function toggleMonth(key: string) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando fotografías...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="card-premium p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <p className="text-sm text-muted-foreground">
              Sin conexión a la base de datos — mostrando demostración del módulo fotográfico
            </p>
          </div>
          <CinematicReveal tratamiento="Hilos Delta Lifting® · Resultado de Ejemplo" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Drawer de subida */}
      <SubirFotoDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pacienteId={pacienteId}
        pacienteNombre={pacienteNombre}
      />

      {/* Lightbox individual */}
      {lightbox && (
        <LightboxModal
          foto={lightbox}
          onClose={() => setLightbox(null)}
          onDelete={(id, path) => deleteFoto({ id, storagePath: path, pacienteId })}
        />
      )}

      {/* Modal cinematográfico de comparación */}
      <AnimatePresence>
        {comparadorPar && (
          <ComparadorModal
            par={comparadorPar}
            pacienteNombre={pacienteNombre}
            onClose={() => setComparadorPar(null)}
          />
        )}
      </AnimatePresence>

      {/* Header de sección */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="label-elegant mb-1">Registro Visual</p>
          <h3 className="font-serif text-xl font-semibold text-foreground">Historial Fotográfico</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {fotos.length > 0
              ? `${fotos.length} fotografía${fotos.length > 1 ? "s" : ""} registrada${fotos.length > 1 ? "s" : ""}`
              : "Sin fotografías registradas"}
          </p>
        </div>
        <button onClick={() => setDrawerOpen(true)} className="btn-primary text-sm">
          <Upload className="w-4 h-4" />
          Subir Fotos
        </button>
      </div>

      {/* Estado vacío — muestra demo cinematográfico */}
      {fotos.length === 0 && (
        <div className="space-y-4">
          {/* Demo reveal */}
          <div className="card-premium p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Vista previa del módulo — sube fotos reales del paciente para comenzar
              </p>
            </div>
            <CinematicReveal tratamiento="Hilos Delta Lifting® · Demostración de Resultados" />
          </div>

          {/* CTA subir primera foto */}
          <div className="card-premium p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/8 border border-primary/15 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-7 h-7 text-primary/40" />
            </div>
            <h4 className="font-serif text-lg font-semibold text-foreground mb-2">
              Registra las fotos de este paciente
            </h4>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
              Sube fotografías del estado inicial para construir el historial visual con comparación Antes & Después.
            </p>
            <button onClick={() => setDrawerOpen(true)} className="btn-primary">
              <Upload className="w-4 h-4" />
              Subir Primera Fotografía
            </button>
          </div>
        </div>
      )}

      {/* Timeline por mes */}
      <div className="space-y-2">
        {grupos.map(([key, fotosDelMes]) => {
          const [year, month] = key.split("-");
          const isCollapsed = collapsedMonths.has(key);
          const par = findPares(fotosDelMes);
          const totalFotos = fotosDelMes.length;
          const countAntes = fotosDelMes.filter((f) => f.tipo === "antes").length;
          const countDespues = fotosDelMes.filter((f) => f.tipo === "despues").length;
          const countSeguimiento = fotosDelMes.filter((f) => f.tipo === "seguimiento").length;

          return (
            <div key={key} className="card-premium overflow-hidden">
              {/* Header del mes */}
              <button
                onClick={() => toggleMonth(key)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-3 h-3 rounded-full bg-primary/60 border-2 border-primary/30" />
                  </div>
                  <div className="text-left">
                    <p className="font-serif font-semibold text-foreground">
                      {MESES_ES[month]} {year}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{totalFotos} foto{totalFotos > 1 ? "s" : ""}</span>
                      {countAntes > 0 && <span className="flex items-center gap-1 text-xs text-blue-600"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />{countAntes} antes</span>}
                      {countDespues > 0 && <span className="flex items-center gap-1 text-xs text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{countDespues} después</span>}
                      {countSeguimiento > 0 && <span className="flex items-center gap-1 text-xs text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{countSeguimiento} seguimiento</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {par && !isCollapsed && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setComparadorPar(par); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/8 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
                    >
                      <SplitSquareHorizontal className="w-3.5 h-3.5" />
                      Comparar
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                </div>
              </button>

              {/* Grid de fotos */}
              {!isCollapsed && (
                <div className="px-6 pb-6">
                  <div className="gold-rule-solid mb-5" />

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {fotosDelMes.map((foto) => (
                      <FotoCard key={foto.id} foto={foto} onClick={() => setLightbox(foto)} />
                    ))}

                    <button
                      onClick={() => setDrawerOpen(true)}
                      className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all group"
                    >
                      <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium">Agregar</span>
                    </button>
                  </div>

                  {/* Botón comparar inline (si hay par) */}
                  {par && par.antes.url && par.despues.url && (
                    <div className="mt-6">
                      <button
                        onClick={() => setComparadorPar(par)}
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-sm transition-all group"
                      >
                        <Maximize2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Ver comparación Antes · Después en pantalla completa
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
