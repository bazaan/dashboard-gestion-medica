"use client";

import { useState, useMemo } from "react";
import {
  Syringe, Plus, Search, Edit2, Trash2, ChevronDown, ChevronUp,
  Infinity, Clock, RefreshCw, CalendarClock, ToggleLeft, ToggleRight,
  Loader2, AlertTriangle,
} from "lucide-react";
import { ProcedimientoDrawer } from "@/components/procedimientos/ProcedimientoDrawer";
import { useProcedimientos, useEliminarProcedimiento } from "@/lib/hooks/useProcedimientos";
import { CATEGORIA_LABELS, type Tratamiento, type TratamientoCategoria } from "@/types/database.types";

// ── Helpers de vigencia ───────────────────────────────────────
function VigenciaBadge({ t }: { t: Tratamiento }) {
  if (t.es_permanente) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Infinity className="w-2.5 h-2.5" /> Permanente
      </span>
    );
  }
  if (t.intervalo_recordatorio_dias) {
    const meses = Math.round(t.intervalo_recordatorio_dias / 30);
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
        <RefreshCw className="w-2.5 h-2.5" />
        c/{meses}m · {t.sesiones_por_ciclo}/año
      </span>
    );
  }
  if (t.duracion_vigencia_meses) {
    const label = t.duracion_vigencia_meses >= 12
      ? `${t.duracion_vigencia_meses / 12} año${t.duracion_vigencia_meses / 12 > 1 ? "s" : ""}`
      : `${t.duracion_vigencia_meses} meses`;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/8 text-primary border border-primary/20">
        <CalendarClock className="w-2.5 h-2.5" /> {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
      Sin vigencia
    </span>
  );
}

// ── Fila de procedimiento ────────────────────────────────────
function ProcedimientoRow({
  t, onEdit, onDelete,
}: {
  t: Tratamiento;
  onEdit: (t: Tratamiento) => void;
  onDelete: (t: Tratamiento) => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group border-b border-border/40 last:border-0 ${!t.is_active ? "opacity-50" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{t.nombre}</span>
          {!t.is_active && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
              Inactivo
            </span>
          )}
          {t.requiere_evaluacion_previa && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
              Eval. previa
            </span>
          )}
        </div>
        {t.descripcion && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">{t.descripcion}</p>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <VigenciaBadge t={t} />
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />{t.duracion_minutos}min
        </span>
        {t.precio_base && (
          <span className="text-xs text-muted-foreground">
            S/.{t.precio_base.toLocaleString()}
          </span>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(t)}
          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
          title="Editar"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(t)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-all"
          title="Eliminar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Grupo por categoría ──────────────────────────────────────
function CategoriaGroup({
  categoria, items, onEdit, onDelete,
}: {
  categoria: string;
  items: Tratamiento[];
  onEdit: (t: Tratamiento) => void;
  onDelete: (t: Tratamiento) => void;
}) {
  const [open, setOpen] = useState(true);
  const activos = items.filter((t) => t.is_active).length;

  return (
    <div className="card-premium overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <span className="flex-1 font-serif font-semibold text-foreground text-sm">
          {CATEGORIA_LABELS[categoria as TratamientoCategoria] ?? categoria}
        </span>
        <span className="text-xs text-muted-foreground mr-2">
          {activos}/{items.length} activos
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border/60">
          {items.map((t) => (
            <ProcedimientoRow key={t.id} t={t} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Confirmación de eliminación ──────────────────────────────
function DeleteConfirm({
  procedimiento, onConfirm, onCancel, isPending,
}: {
  procedimiento: Tratamiento;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-60 w-full max-w-sm bg-background rounded-2xl shadow-2xl border border-border p-6">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="font-serif text-base font-semibold text-center mb-1">¿Eliminar procedimiento?</h3>
        <p className="text-sm text-muted-foreground text-center mb-1">
          <strong>{procedimiento.nombre}</strong>
        </p>
        <p className="text-xs text-muted-foreground text-center mb-5">
          Si tiene consultas o seguimientos asociados, no podrá eliminarse. En ese caso, desactívalo.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Eliminar
          </button>
        </div>
      </div>
    </>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function ProcedimientosPage() {
  const [search, setSearch]       = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editando, setEditando]   = useState<Tratamiento | null>(null);
  const [eliminando, setEliminando] = useState<Tratamiento | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const { data: todos = [], isLoading } = useProcedimientos();
  const eliminar = useEliminarProcedimiento();

  // Filtrar
  const filtrados = useMemo(() => {
    return todos.filter((t) => {
      const matchSearch = !search || t.nombre.toLowerCase().includes(search.toLowerCase());
      const matchActivo = mostrarInactivos || t.is_active;
      return matchSearch && matchActivo;
    });
  }, [todos, search, mostrarInactivos]);

  // Agrupar por categoría (respetando orden del enum)
  const ORDEN_CATEGORIAS = Object.keys(CATEGORIA_LABELS) as TratamientoCategoria[];
  const porCategoria = ORDEN_CATEGORIAS
    .map((cat) => ({
      categoria: cat,
      items: filtrados.filter((t) => t.categoria === cat),
    }))
    .filter((g) => g.items.length > 0);

  const stats = {
    total:   todos.length,
    activos: todos.filter((t) => t.is_active).length,
    cats:    new Set(todos.map((t) => t.categoria)).size,
  };

  function handleEdit(t: Tratamiento) {
    setEditando(t);
    setDrawerOpen(true);
  }

  function handleNew() {
    setEditando(null);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!eliminando) return;
    await eliminar.mutateAsync(eliminando.id);
    setEliminando(null);
  }

  return (
    <div className="min-h-full bg-background">

      <ProcedimientoDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditando(null); }}
        editando={editando}
      />

      {eliminando && (
        <DeleteConfirm
          procedimiento={eliminando}
          onConfirm={handleDelete}
          onCancel={() => setEliminando(null)}
          isPending={eliminar.isPending}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2.5">
            <Syringe className="w-4 h-4 text-primary/60" />
            <span className="font-serif text-sm md:text-base font-semibold">Catálogo de Procedimientos</span>
          </div>
          <button onClick={handleNew} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Procedimiento</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-5xl mx-auto space-y-6">

        {/* Título + stats */}
        <div className="fade-up">
          <p className="label-elegant mb-1.5">Gestión de Tratamientos</p>
          <div className="flex items-end justify-between flex-wrap gap-2">
            <h2 className="font-serif text-xl md:text-2xl font-semibold">Procedimientos</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span><strong className="text-foreground">{stats.activos}</strong> activos</span>
              <span><strong className="text-foreground">{stats.total}</strong> total</span>
              <span><strong className="text-foreground">{stats.cats}</strong> categorías</span>
            </div>
          </div>
          <div className="gold-rule mt-4" />
        </div>

        {/* Búsqueda + toggle inactivos */}
        <div className="flex gap-3 items-center fade-up stagger-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar procedimiento…"
              className="input-premium pl-10"
            />
          </div>
          <button
            onClick={() => setMostrarInactivos((v) => !v)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all shrink-0 ${
              mostrarInactivos
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            {mostrarInactivos
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft  className="w-4 h-4" />}
            <span className="hidden sm:inline">Inactivos</span>
          </button>
        </div>

        {/* Lista */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">Cargando catálogo…</span>
          </div>
        )}

        {!isLoading && porCategoria.length === 0 && (
          <div className="py-16 text-center card-premium">
            <Syringe className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? `Sin resultados para "${search}"` : "El catálogo está vacío"}
            </p>
          </div>
        )}

        <div className="space-y-3 fade-up stagger-2">
          {porCategoria.map(({ categoria, items }) => (
            <CategoriaGroup
              key={categoria}
              categoria={categoria}
              items={items}
              onEdit={handleEdit}
              onDelete={setEliminando}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
