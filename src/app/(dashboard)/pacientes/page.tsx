"use client";

import {
  Search, Plus, SlidersHorizontal, MoreHorizontal, Users,
  ChevronLeft, ChevronRight, ArrowUpDown, Eye, ClipboardList,
  Phone, Loader2,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NuevoPacienteDrawer } from "@/components/pacientes/NuevoPacienteDrawer";
import { usePacientes, getInitials } from "@/lib/hooks/usePacientes";

const ESTADO_BADGE: Record<string, string> = {
  vip:      "bg-primary/10 text-primary border-primary/20 font-semibold",
  activo:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactivo: "bg-slate-50 text-slate-500 border-slate-200",
};
const ESTADO_LABEL: Record<string, string> = {
  vip: "VIP", activo: "Activo", inactivo: "Inactivo",
};

const PAGE_SIZE = 20;

export default function PacientesPage() {
  const router = useRouter();
  const [search, setSearch]       = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage]           = useState(1);

  const { data: pacientes = [], isLoading, error } = usePacientes(search);

  const paginated = pacientes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(pacientes.length / PAGE_SIZE));

  return (
    <div className="min-h-full bg-background">
      <NuevoPacienteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => setDrawerOpen(false)}
      />

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

          {/* Estado de carga */}
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
                  <div
                    key={p.id}
                    onClick={() => router.push(`/pacientes/${p.id}`)}
                    className="px-4 py-4 flex items-center gap-3 hover:bg-muted/25 active:bg-muted/40 transition-colors cursor-pointer"
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
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
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
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                            >
                              <ClipboardList className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
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
