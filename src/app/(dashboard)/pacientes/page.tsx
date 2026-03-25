"use client";

import {
  Search, Plus, SlidersHorizontal, MoreHorizontal, Users,
  ChevronLeft, ChevronRight, ArrowUpDown, Eye, ClipboardList,
  Phone,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NuevoPacienteDrawer } from "@/components/pacientes/NuevoPacienteDrawer";

const PACIENTES = [
  { id: 1, nombre: "María González",  dni: "45871236", telefono: "+51 987 654 321", tratamiento: "Hilos Delta Lifting®", fecha: "20 Mar 2025", estado: "vip",      initials: "MG", sesiones: 8 },
  { id: 2, nombre: "Lucía Fernández", dni: "72145896", telefono: "+51 912 345 678", tratamiento: "Reshape Facial",       fecha: "21 Mar 2025", estado: "activo",   initials: "LF", sesiones: 3 },
  { id: 3, nombre: "Camila Rojas",    dni: "12547896", telefono: "+51 945 678 901", tratamiento: "Visage 3D",            fecha: "24 Mar 2025", estado: "activo",   initials: "CR", sesiones: 5 },
  { id: 4, nombre: "Valeria Mendoza", dni: "41258745", telefono: "+51 978 901 234", tratamiento: "PRP Facial",           fecha: "25 Mar 2025", estado: "activo",   initials: "VM", sesiones: 2 },
  { id: 5, nombre: "Andrea Torres",   dni: "85412369", telefono: "+51 956 234 567", tratamiento: "Botox + Relleno",      fecha: "26 Mar 2025", estado: "activo",   initials: "AT", sesiones: 6 },
  { id: 6, nombre: "Sofia Paredes",   dni: "63147852", telefono: "+51 923 456 789", tratamiento: "Bioestimulación",      fecha: "27 Mar 2025", estado: "inactivo", initials: "SP", sesiones: 1 },
];

const ESTADO_BADGE: Record<string, string> = {
  vip:      "bg-primary/10 text-primary border-primary/20 font-semibold",
  activo:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactivo: "bg-slate-50 text-slate-500 border-slate-200",
};
const ESTADO_LABEL: Record<string, string> = { vip: "VIP", activo: "Activo", inactivo: "Inactivo" };

export default function PacientesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = PACIENTES.filter(
    (p) => p.nombre.toLowerCase().includes(search.toLowerCase()) || p.dni.includes(search)
  );

  return (
    <div className="min-h-full bg-background">
      <NuevoPacienteDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => setDrawerOpen(false)} />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-primary/60" />
            <span className="font-serif text-sm md:text-base font-semibold text-foreground">Gestión de Pacientes</span>
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
            <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground">Pacientes Registrados</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> encontrados
            </p>
          </div>
          <div className="gold-rule mt-4" />
        </div>

        <div className="card-premium fade-up stagger-1">
          {/* Barra de búsqueda */}
          <div className="px-4 md:px-6 py-3.5 md:py-4 border-b border-border flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o DNI…"
                className="input-premium pl-10"
              />
            </div>
            <button className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors font-medium shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <span className="hidden sm:inline">Filtrar</span>
            </button>
          </div>

          {/* ── MOBILE: lista de cards ──────────────────────────── */}
          <div className="md:hidden divide-y divide-border/60">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/pacientes/${p.id}`)}
                className="px-4 py-4 flex items-center gap-3 hover:bg-muted/25 active:bg-muted/40 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {p.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm text-foreground truncate">{p.nombre}</p>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${ESTADO_BADGE[p.estado]}`}>
                      {ESTADO_LABEL[p.estado]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.tratamiento}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">{p.dni}</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Phone className="w-2.5 h-2.5" />{p.sesiones} sesiones
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </div>
            ))}
          </div>

          {/* ── DESKTOP: tabla ──────────────────────────────────── */}
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
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tratamiento</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Sesiones</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Último Reg.</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/25 transition-colors group cursor-pointer" onClick={() => router.push(`/pacientes/${p.id}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {p.initials}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{p.nombre}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.telefono}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="font-mono text-sm text-foreground/80">{p.dni}</span></td>
                    <td className="px-6 py-4"><span className="text-sm text-foreground/80">{p.tratamiento}</span></td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(p.sesiones, 6) }).map((_, j) => (
                            <div key={j} className="w-2 h-2 rounded-full bg-primary/40" />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{p.sesiones}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell"><span className="text-sm text-muted-foreground">{p.fecha}</span></td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ESTADO_BADGE[p.estado]}`}>
                        {ESTADO_LABEL[p.estado]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/pacientes/${p.id}`} onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><Eye className="w-4 h-4" /></Link>
                        <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><ClipboardList className="w-4 h-4" /></button>
                        <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"><MoreHorizontal className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="px-4 md:px-6 py-3.5 border-t border-border flex items-center justify-between bg-muted/20 flex-wrap gap-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">1–{filtered.length}</span> de{" "}
              <span className="font-semibold text-foreground">{PACIENTES.length}</span> pacientes
            </p>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40" disabled>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-semibold">1</button>
              <button className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
