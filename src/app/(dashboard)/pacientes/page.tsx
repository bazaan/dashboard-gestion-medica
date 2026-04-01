"use client";

import {
  Search, Plus, SlidersHorizontal, MoreHorizontal, Users,
  ChevronLeft, ChevronRight, ArrowUpDown, Eye, Pencil, Trash2,
  Phone, Loader2, UserCheck, UserX, Star,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NuevoPacienteDrawer } from "@/components/pacientes/NuevoPacienteDrawer";
import { usePacientes, useEliminarPaciente, useActualizarEstadoPaciente, getInitials } from "@/lib/hooks/usePacientes";
import type { Paciente, PacienteEstado } from "@/types/database.types";

const ESTADO_BADGE: Record<string, string> = {
  vip:      "bg-primary/10 text-primary border-primary/20 font-semibold",
  activo:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactivo: "bg-slate-50 text-slate-500 border-slate-200",
};
const ESTADO_LABEL: Record<string, string> = {
  vip: "VIP", activo: "Activo", inactivo: "Inactivo",
};

const PAGE_SIZE = 20;

// ── Menú contextual de tres puntos ───────────────────────────
function AccionesMenu({
  paciente,
  onEdit,
  onDelete,
  onEstado,
}: {
  paciente: Paciente;
  onEdit: () => void;
  onDelete: () => void;
  onEstado: (estado: PacienteEstado) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-8 z-50 w-48 bg-background border border-border rounded-xl shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            Editar datos
          </button>

          <div className="my-1 border-t border-border/60" />

          {paciente.estado !== "activo" && (
            <button
              onClick={() => { onEstado("activo"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              Marcar Activo
            </button>
          )}
          {paciente.estado !== "vip" && (
            <button
              onClick={() => { onEstado("vip"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
            >
              <Star className="w-3.5 h-3.5 text-primary" />
              Marcar VIP
            </button>
          )}
          {paciente.estado !== "inactivo" && (
            <button
              onClick={() => { onEstado("inactivo"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
            >
              <UserX className="w-3.5 h-3.5 text-slate-400" />
              Marcar Inactivo
            </button>
          )}

          <div className="my-1 border-t border-border/60" />

          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar paciente
          </button>
        </div>
      )}
    </div>
  );
}

// ── Modal de confirmación de eliminación ──────────────────────
function ConfirmarEliminar({
  paciente,
  onConfirm,
  onCancel,
  loading,
}: {
  paciente: Paciente;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Eliminar paciente</h3>
            <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-foreground mb-1">
          ¿Estás seguro de eliminar a <strong>{paciente.nombres} {paciente.apellidos}</strong>?
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Se eliminarán todos sus datos, historia clínica, consultas y fotografías.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function PacientesPage() {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editPaciente, setEditPaciente] = useState<Paciente | undefined>(undefined);
  const [deletePaciente, setDeletePaciente] = useState<Paciente | null>(null);
  const [page, setPage]             = useState(1);

  const { data: pacientes = [], isLoading, error } = usePacientes(search);
  const { mutate: eliminar, isPending: eliminando } = useEliminarPaciente();
  const { mutate: cambiarEstado } = useActualizarEstadoPaciente();

  const paginated = pacientes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(pacientes.length / PAGE_SIZE));

  function handleEdit(p: Paciente) {
    setEditPaciente(p);
    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditPaciente(undefined);
  }

  return (
    <div className="min-h-full bg-background">
      <NuevoPacienteDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onSuccess={handleCloseDrawer}
        paciente={editPaciente}
      />

      {deletePaciente && (
        <ConfirmarEliminar
          paciente={deletePaciente}
          loading={eliminando}
          onCancel={() => setDeletePaciente(null)}
          onConfirm={() =>
            eliminar(deletePaciente.id, {
              onSuccess: () => setDeletePaciente(null),
            })
          }
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-primary/60" />
            <span className="font-serif text-sm md:text-base font-semibold text-foreground">
              Gestión de Pacientes
            </span>
          </div>
          <button onClick={() => setDrawerOpen(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Paciente</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 space-y-5 md:space-y-6 max-w-7xl mx-auto">
        <div className="fade-up">
          <p className="label-elegant mb-1.5">Directorio Médico</p>
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground">
              Pacientes Registrados
            </h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{pacientes.length}</span> encontrados
            </p>
          </div>
          <div className="gold-rule mt-4" />
        </div>

        <div className="card-premium fade-up stagger-1">
          {/* Búsqueda */}
          <div className="px-4 md:px-6 py-3.5 md:py-4 border-b border-border flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar por nombre, apellido o DNI…"
                className="input-premium pl-10"
              />
            </div>
            <button className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors font-medium shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <span className="hidden sm:inline">Filtrar</span>
            </button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">Cargando pacientes…</span>
            </div>
          )}

          {error && (
            <div className="py-10 text-center">
              <p className="text-sm text-red-500">Error al cargar pacientes. Verifica tu conexión.</p>
            </div>
          )}

          {!isLoading && !error && paginated.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? `No se encontraron pacientes con "${search}"` : "Aún no hay pacientes registrados"}
              </p>
              {!search && (
                <button onClick={() => setDrawerOpen(true)} className="btn-primary text-sm mt-4 mx-auto">
                  <Plus className="w-4 h-4" /> Registrar primer paciente
                </button>
              )}
            </div>
          )}

          {!isLoading && !error && paginated.length > 0 && (
            <>
              {/* MOBILE: lista de cards */}
              <div className="md:hidden divide-y divide-border/60">
                {paginated.map((p) => (
                  <div key={p.id} className="px-4 py-4 flex items-center gap-3 hover:bg-muted/25 active:bg-muted/40 transition-colors">
                    <div
                      onClick={() => router.push(`/pacientes/${p.id}`)}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {getInitials(p.nombres, p.apellidos)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {p.nombres} {p.apellidos}
                          </p>
                          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${ESTADO_BADGE[p.estado]}`}>
                            {ESTADO_LABEL[p.estado]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">{p.dni}</span>
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Phone className="w-2.5 h-2.5" />{p.telefono}
                          </span>
                        </div>
                      </div>
                    </div>
                    <AccionesMenu
                      paciente={p}
                      onEdit={() => handleEdit(p)}
                      onDelete={() => setDeletePaciente(p)}
                      onEstado={(estado) => cambiarEstado({ id: p.id, estado })}
                    />
                  </div>
                ))}
              </div>

              {/* DESKTOP: tabla */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-6 py-3.5 text-left">
                        <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                          Paciente <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">DNI</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Teléfono</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Registro</th>
                      <th className="px-6 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginated.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-muted/25 transition-colors group cursor-pointer"
                        onClick={() => router.push(`/pacientes/${p.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {getInitials(p.nombres, p.apellidos)}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                                {p.nombres} {p.apellidos}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{p.numero_historia}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-foreground/80">{p.dni}</span>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">{p.telefono}</span>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("es-PE")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ESTADO_BADGE[p.estado]}`}>
                            {ESTADO_LABEL[p.estado]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/pacientes/${p.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                              title="Ver perfil"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <AccionesMenu
                              paciente={p}
                              onEdit={() => handleEdit(p)}
                              onDelete={() => setDeletePaciente(p)}
                              onEstado={(estado) => cambiarEstado({ id: p.id, estado })}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Paginación */}
          {!isLoading && pacientes.length > PAGE_SIZE && (
            <div className="px-4 md:px-6 py-3.5 border-t border-border flex items-center justify-between bg-muted/20 flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pacientes.length)}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-foreground">{pacientes.length}</span> pacientes
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .map((n, i, arr) => (
                    <>
                      {i > 0 && arr[i - 1] !== n - 1 && (
                        <span key={`dots-${n}`} className="px-1 text-muted-foreground text-xs">…</span>
                      )}
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          page === n ? "bg-primary text-white" : "border border-border hover:bg-muted text-foreground"
                        }`}
                      >
                        {n}
                      </button>
                    </>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
