"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell, RefreshCw, AlertTriangle, Clock, CheckCircle2,
  Infinity, Phone, Search, ChevronRight, Loader2, Calendar,
  MessageCircle, Send, XCircle, Hourglass,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type {
  RenovacionVista, TratamientoCategoria,
  RecordatorioLog, Paciente,
} from "@/types/database.types";
import { CATEGORIA_LABELS } from "@/types/database.types";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab       = "seguimientos" | "recordatorios";
type Filtro    = "todos" | "vencido" | "proximo_vencer" | "vigente" | "permanente";
type FiltroRec = "todos" | "pendiente" | "enviado" | "fallido";

type RecordatorioConPaciente = RecordatorioLog & {
  pacientes: Pick<Paciente, "nombres" | "apellidos" | "telefono"> | null;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const FILTRO_CONFIG: Record<Filtro, { label: string; icon: React.ElementType; color: string }> = {
  todos:          { label: "Todos",       icon: RefreshCw,     color: "text-foreground" },
  vencido:        { label: "Vencidos",    icon: AlertTriangle, color: "text-red-500"    },
  proximo_vencer: { label: "Por vencer",  icon: Clock,         color: "text-amber-500"  },
  vigente:        { label: "Vigentes",    icon: CheckCircle2,  color: "text-emerald-500"},
  permanente:     { label: "Permanentes", icon: Infinity,      color: "text-primary"    },
};

const ESTADO_BADGE: Record<string, string> = {
  vencido:        "bg-red-50 text-red-600 border-red-200",
  proximo_vencer: "bg-amber-50 text-amber-600 border-amber-200",
  vigente:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  permanente:     "bg-primary/10 text-primary border-primary/20",
};
const ESTADO_LABEL: Record<string, string> = {
  vencido:        "Vencido",
  proximo_vencer: "Por vencer",
  vigente:        "Vigente",
  permanente:     "Permanente",
};

const TIPO_REC_BADGE: Record<string, string> = {
  "30_dias":    "bg-blue-50 text-blue-700 border-blue-200",
  "7_dias":     "bg-amber-50 text-amber-700 border-amber-200",
  "vencimiento":"bg-red-50 text-red-600 border-red-200",
};
const TIPO_REC_LABEL: Record<string, string> = {
  "30_dias":    "30 días",
  "7_dias":     "7 días",
  "vencimiento":"Vencimiento",
};

const ESTADO_REC_BADGE: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700 border-amber-200",
  enviado:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  fallido:   "bg-red-50 text-red-600 border-red-200",
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useRenovaciones() {
  return useQuery({
    queryKey: ["renovaciones"],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("renovaciones_vista")
        .select("*");
      if (error?.code === "PGRST200" || error?.message?.includes("renovaciones_vista")) {
        return { needsMigration: true, data: [] as RenovacionVista[] };
      }
      if (error) throw error;
      return { needsMigration: false, data: (data ?? []) as RenovacionVista[] };
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: false,
  });
}

function useRecordatorios() {
  return useQuery({
    queryKey: ["recordatorios_log"],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("recordatorios_log")
        .select("*, pacientes!paciente_id(nombres, apellidos, telefono)")
        .order("fecha_programada", { ascending: false })
        .limit(500);
      if (error?.code === "PGRST200" || error?.message?.includes("recordatorios_log")) {
        return { needsMigration: true, data: [] as RecordatorioConPaciente[] };
      }
      if (error) throw error;
      return { needsMigration: false, data: (data ?? []) as RecordatorioConPaciente[] };
    },
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(fecha: string | null) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-PE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function diasLabel(dias: number | null, estado: string): string {
  if (estado === "permanente") return "Permanente";
  if (dias === null) return "—";
  if (dias < 0)  return `Venció hace ${Math.abs(dias)} días`;
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  if (dias <= 30) return `En ${dias} días`;
  if (dias < 365) return `En ${Math.round(dias / 30)} meses`;
  return `En ${(dias / 365).toFixed(1)} años`;
}

function isHoyOPasado(fecha: string): boolean {
  return fecha <= new Date().toISOString().slice(0, 10);
}

// ─── Tab: Seguimientos ────────────────────────────────────────────────────────

function TabSeguimientos() {
  const [filtro, setFiltro]     = useState<Filtro>("todos");
  const [search, setSearch]     = useState("");
  const [catFiltro, setCatFiltro] = useState<string>("todas");

  const { data: queryResult, isLoading, error } = useRenovaciones();
  const needsMigration = queryResult?.needsMigration ?? false;
  const renovaciones   = queryResult?.data ?? [];

  const stats = {
    vencidos:    renovaciones.filter((r) => r.estado_actual === "vencido").length,
    proximos:    renovaciones.filter((r) => r.estado_actual === "proximo_vencer").length,
    vigentes:    renovaciones.filter((r) => r.estado_actual === "vigente").length,
    permanentes: renovaciones.filter((r) => r.estado_actual === "permanente").length,
  };

  const categorias = [...new Set(renovaciones.map((r) => r.categoria))];

  const filtradas = renovaciones.filter((r) => {
    const matchFiltro = filtro === "todos" || r.estado_actual === filtro;
    const matchSearch = !search || r.paciente_nombre.toLowerCase().includes(search.toLowerCase())
      || r.tratamiento_nombre.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFiltro === "todas" || r.categoria === catFiltro;
    return matchFiltro && matchSearch && matchCat;
  });

  const ordenadas = [...filtradas].sort((a, b) => {
    const prioridad: Record<string, number> = {
      vencido: 0, proximo_vencer: 1, vigente: 2, permanente: 3,
    };
    const pa = prioridad[a.estado_actual] ?? 4;
    const pb = prioridad[b.estado_actual] ?? 4;
    if (pa !== pb) return pa - pb;
    return (a.dias_para_vencer ?? 9999) - (b.dias_para_vencer ?? 9999);
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-premium p-4 border-l-2 border-l-red-400">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vencidos</p>
          </div>
          <p className="font-serif text-3xl font-semibold text-red-500">{stats.vencidos}</p>
          <p className="text-xs text-muted-foreground mt-1">necesitan renovación</p>
        </div>
        <div className="card-premium p-4 border-l-2 border-l-amber-400">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por Vencer</p>
          </div>
          <p className="font-serif text-3xl font-semibold text-amber-500">{stats.proximos}</p>
          <p className="text-xs text-muted-foreground mt-1">en los próximos 30 días</p>
        </div>
        <div className="card-premium p-4 border-l-2 border-l-emerald-400">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vigentes</p>
          </div>
          <p className="font-serif text-3xl font-semibold text-emerald-600">{stats.vigentes}</p>
          <p className="text-xs text-muted-foreground mt-1">tratamientos activos</p>
        </div>
        <div className="card-premium p-4 border-l-2 border-l-primary">
          <div className="flex items-center gap-2 mb-1">
            <Infinity className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permanentes</p>
          </div>
          <p className="font-serif text-3xl font-semibold text-primary">{stats.permanentes}</p>
          <p className="text-xs text-muted-foreground mt-1">sin vencimiento</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card-premium">
        <div className="px-4 md:px-6 py-4 border-b border-border space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar paciente o tratamiento…"
                className="input-premium pl-10"
              />
            </div>
            <select
              value={catFiltro}
              onChange={(e) => setCatFiltro(e.target.value)}
              className="input-premium sm:max-w-[180px]"
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIA_LABELS[c as TratamientoCategoria] ?? c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(FILTRO_CONFIG) as [Filtro, typeof FILTRO_CONFIG[Filtro]][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const count = key === "todos"
                ? renovaciones.length
                : renovaciones.filter((r) => r.estado_actual === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setFiltro(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    filtro === key
                      ? "bg-foreground text-background border-foreground"
                      : "border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-3 h-3 ${filtro === key ? "" : cfg.color}`} />
                  {cfg.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    filtro === key ? "bg-white/20" : "bg-muted"
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">Cargando seguimientos…</span>
          </div>
        )}

        {(error || needsMigration) && (
          <div className="py-12 px-6 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            </div>
            <h4 className="font-serif text-base font-semibold text-foreground mb-2">Migración pendiente</h4>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Ejecuta{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">supabase/migration_v2.sql</code>{" "}
              en el SQL Editor de Supabase.
            </p>
            <div className="text-left bg-muted rounded-xl p-4 text-xs font-mono text-muted-foreground space-y-1">
              <p>1. Abre Supabase Dashboard</p>
              <p>2. SQL Editor → New Query</p>
              <p>3. Pega el contenido de <span className="text-primary">migration_v2.sql</span></p>
              <p>4. Ejecuta → recarga esta página</p>
            </div>
          </div>
        )}

        {!isLoading && !error && ordenadas.length === 0 && (
          <div className="py-16 text-center">
            <RefreshCw className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filtro !== "todos" || search
                ? "No hay tratamientos con ese filtro"
                : "Aún no hay seguimientos. Se crean automáticamente al registrar consultas."}
            </p>
          </div>
        )}

        {!isLoading && !error && ordenadas.length > 0 && (
          <>
            {/* MOBILE */}
            <div className="md:hidden divide-y divide-border/60">
              {ordenadas.map((r) => (
                <div key={r.id} className="px-4 py-4 active:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{r.paciente_nombre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.tratamiento_nombre}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${ESTADO_BADGE[r.estado_actual]}`}>
                      {ESTADO_LABEL[r.estado_actual]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatFecha(r.fecha_vencimiento)}
                    </span>
                    <span className="font-medium text-foreground">
                      {diasLabel(r.dias_para_vencer, r.estado_actual)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5">
                    <a
                      href={r.paciente_telefono ? `https://wa.me/51${r.paciente_telefono.replace(/\D/g, "").slice(-9)}` : "#"}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </a>
                    <Link
                      href={`/pacientes/${r.paciente_id}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-medium hover:bg-border transition-colors"
                    >
                      Ver paciente <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paciente</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tratamiento</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Categoría</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Realizado</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vence</th>
                    <th className="px-6 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {ordenadas.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{r.paciente_nombre}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />{r.paciente_telefono}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground/90 font-medium">{r.tratamiento_nombre}</p>
                      </td>
                      <td className="px-6 py-4 hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {CATEGORIA_LABELS[r.categoria as TratamientoCategoria] ?? r.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">{formatFecha(r.fecha_realizacion)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground font-medium">{formatFecha(r.fecha_vencimiento)}</p>
                        <p className={`text-xs mt-0.5 ${
                          r.estado_actual === "vencido" ? "text-red-500 font-semibold" :
                          r.estado_actual === "proximo_vencer" ? "text-amber-500 font-semibold" :
                          "text-muted-foreground"
                        }`}>
                          {diasLabel(r.dias_para_vencer, r.estado_actual)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ESTADO_BADGE[r.estado_actual]}`}>
                          {ESTADO_LABEL[r.estado_actual]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={r.paciente_telefono ? `https://wa.me/51${r.paciente_telefono.replace(/\D/g, "").slice(-9)}` : "#"}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WA
                          </a>
                          <Link
                            href={`/pacientes/${r.paciente_id}`}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              Mostrando <span className="font-semibold text-foreground">{ordenadas.length}</span> de{" "}
              <span className="font-semibold text-foreground">{renovaciones.length}</span> seguimientos
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Recordatorios WA ────────────────────────────────────────────────────

function TabRecordatorios() {
  const [filtro, setFiltro] = useState<FiltroRec>("todos");
  const [search, setSearch] = useState("");

  const { data: queryResult, isLoading, error } = useRecordatorios();
  const needsMigration = queryResult?.needsMigration ?? false;
  const todos = queryResult?.data ?? [];

  const today = new Date().toISOString().slice(0, 10);

  const stats = {
    pendientesHoy: todos.filter((r) => r.estado === "pendiente" && isHoyOPasado(r.fecha_programada)).length,
    enviados:      todos.filter((r) => r.estado === "enviado").length,
    fallidos:      todos.filter((r) => r.estado === "fallido").length,
  };

  const filtrados = todos.filter((r) => {
    const matchFiltro = filtro === "todos" || r.estado === filtro;
    const nombre = r.pacientes
      ? `${r.pacientes.nombres} ${r.pacientes.apellidos}`.toLowerCase()
      : "";
    const matchSearch = !search || nombre.includes(search.toLowerCase());
    return matchFiltro && matchSearch;
  });

  const FILTRO_REC_CONFIG: Record<FiltroRec, { label: string; icon: React.ElementType; color: string }> = {
    todos:     { label: "Todos",     icon: RefreshCw,     color: "text-foreground"  },
    pendiente: { label: "Pendiente", icon: Hourglass,     color: "text-amber-500"   },
    enviado:   { label: "Enviado",   icon: Send,          color: "text-emerald-500" },
    fallido:   { label: "Fallido",   icon: XCircle,       color: "text-red-500"     },
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-premium p-4 border-l-2 border-l-amber-400">
          <div className="flex items-center gap-2 mb-1">
            <Hourglass className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por enviar hoy</p>
          </div>
          <p className="font-serif text-3xl font-semibold text-amber-500">{stats.pendientesHoy}</p>
          <p className="text-xs text-muted-foreground mt-1">pendientes · fecha ≤ hoy</p>
        </div>
        <div className="card-premium p-4 border-l-2 border-l-emerald-400">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enviados</p>
          </div>
          <p className="font-serif text-3xl font-semibold text-emerald-600">{stats.enviados}</p>
          <p className="text-xs text-muted-foreground mt-1">mensajes entregados</p>
        </div>
        <div className="card-premium p-4 border-l-2 border-l-red-400">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-400" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fallidos</p>
          </div>
          <p className="font-serif text-3xl font-semibold text-red-500">{stats.fallidos}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.fallidos > 0 ? "revisar error_msg" : "sin errores"}
          </p>
        </div>
      </div>

      {/* Info del servicio */}
      <div className="card-premium p-4 border-l-2 border-l-primary/40 flex items-start gap-3">
        <Bell className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-foreground">Servicio de recordatorios automáticos</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            El servicio Python en Railway consulta esta tabla diariamente a las{" "}
            <strong className="text-foreground">9:00 AM</strong> y envía los mensajes con estado{" "}
            <code className="text-[10px] bg-muted px-1 rounded font-mono text-amber-600">pendiente</code> cuya{" "}
            <code className="text-[10px] bg-muted px-1 rounded font-mono">fecha_programada</code> sea hoy o anterior.
            Los recordatorios se generan automáticamente en 3 momentos:{" "}
            <strong>30 días antes</strong>, <strong>7 días antes</strong> y el <strong>día del vencimiento</strong>.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card-premium">
        <div className="px-4 md:px-6 py-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar paciente…"
              className="input-premium pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(FILTRO_REC_CONFIG) as [FiltroRec, typeof FILTRO_REC_CONFIG[FiltroRec]][]).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const count = key === "todos"
                ? todos.length
                : todos.filter((r) => r.estado === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setFiltro(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    filtro === key
                      ? "bg-foreground text-background border-foreground"
                      : "border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-3 h-3 ${filtro === key ? "" : cfg.color}`} />
                  {cfg.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    filtro === key ? "bg-white/20" : "bg-muted"
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">Cargando recordatorios…</span>
          </div>
        )}

        {(error || needsMigration) && (
          <div className="py-12 px-6 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            </div>
            <h4 className="font-serif text-base font-semibold mb-2">Migración pendiente</h4>
            <p className="text-sm text-muted-foreground">
              Ejecuta <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">supabase/migration_v2.sql</code> en Supabase.
            </p>
          </div>
        )}

        {!isLoading && !error && filtrados.length === 0 && (
          <div className="py-16 text-center">
            <Send className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filtro !== "todos" || search
                ? "No hay recordatorios con ese filtro"
                : "Aún no hay recordatorios. Se generan al registrar procedimientos."}
            </p>
          </div>
        )}

        {!isLoading && !error && filtrados.length > 0 && (
          <>
            {/* MOBILE */}
            <div className="md:hidden divide-y divide-border/60">
              {filtrados.map((r) => {
                const nombre = r.pacientes
                  ? `${r.pacientes.nombres} ${r.pacientes.apellidos}`
                  : "—";
                const isUrgente = r.estado === "pendiente" && isHoyOPasado(r.fecha_programada);
                return (
                  <div key={r.id} className={`px-4 py-4 ${isUrgente ? "bg-amber-50/30" : ""}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{nombre}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" />{r.pacientes?.telefono ?? "—"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${TIPO_REC_BADGE[r.tipo]}`}>
                          {TIPO_REC_LABEL[r.tipo]}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${ESTADO_REC_BADGE[r.estado]}`}>
                          {r.estado}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Programado: {formatFecha(r.fecha_programada)}
                      </span>
                      {r.fecha_enviada && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Send className="w-3 h-3" /> {formatFecha(r.fecha_enviada)}
                        </span>
                      )}
                    </div>
                    {r.estado === "fallido" && (r as RecordatorioConPaciente & { error_msg?: string }).error_msg && (
                      <p className="mt-2 text-[10px] text-red-500 bg-red-50 rounded px-2 py-1 font-mono truncate">
                        {(r as RecordatorioConPaciente & { error_msg?: string }).error_msg}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* DESKTOP */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paciente</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Programado</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enviado</th>
                    <th className="px-6 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtrados.map((r) => {
                    const nombre = r.pacientes
                      ? `${r.pacientes.nombres} ${r.pacientes.apellidos}`
                      : "—";
                    const isUrgente = r.estado === "pendiente" && r.fecha_programada <= today;
                    const errorMsg = (r as RecordatorioConPaciente & { error_msg?: string }).error_msg;
                    return (
                      <tr key={r.id} className={`transition-colors group ${isUrgente ? "bg-amber-50/20 hover:bg-amber-50/40" : "hover:bg-muted/20"}`}>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-sm text-foreground">{nombre}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />{r.pacientes?.telefono ?? "—"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${TIPO_REC_BADGE[r.tipo]}`}>
                            {TIPO_REC_LABEL[r.tipo]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm ${isUrgente ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
                            {formatFecha(r.fecha_programada)}
                            {isUrgente && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">HOY</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">
                            {r.fecha_enviada ? formatFecha(r.fecha_enviada) : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ESTADO_REC_BADGE[r.estado]}`}>
                            {r.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden xl:table-cell">
                          {errorMsg ? (
                            <p className="text-[11px] text-red-500 font-mono truncate max-w-[200px]" title={errorMsg}>
                              {errorMsg}
                            </p>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              Mostrando <span className="font-semibold text-foreground">{filtrados.length}</span> de{" "}
              <span className="font-semibold text-foreground">{todos.length}</span> recordatorios
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RenovacionesPage() {
  const [tab, setTab] = useState<Tab>("seguimientos");

  const { data: renData }    = useRenovaciones();
  const { data: recData }    = useRecordatorios();

  const alertCount = (renData?.data ?? [])
    .filter((r) => r.estado_actual === "vencido" || r.estado_actual === "proximo_vencer").length;

  const pendientesHoy = (recData?.data ?? [])
    .filter((r) => r.estado === "pendiente" && isHoyOPasado(r.fecha_programada)).length;

  return (
    <div className="min-h-full bg-background">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-primary/60" />
            <span className="font-serif text-sm md:text-base font-semibold text-foreground">
              Renovaciones & Recordatorios
            </span>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              {alertCount} requieren atención
            </div>
          )}
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto space-y-6">

        {/* Título */}
        <div className="fade-up">
          <p className="label-elegant mb-1.5">Sistema de Auto-Renovación</p>
          <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground">
            Seguimiento de Tratamientos
          </h2>
          <div className="gold-rule mt-4" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit fade-up stagger-1">
          <button
            onClick={() => setTab("seguimientos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "seguimientos"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Seguimientos
            {alertCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                {alertCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("recordatorios")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "recordatorios"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Recordatorios WA
            {pendientesHoy > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {pendientesHoy}
              </span>
            )}
          </button>
        </div>

        {/* Contenido del tab activo */}
        <div className="fade-up stagger-2">
          {tab === "seguimientos" ? <TabSeguimientos /> : <TabRecordatorios />}
        </div>

      </div>
    </div>
  );
}
