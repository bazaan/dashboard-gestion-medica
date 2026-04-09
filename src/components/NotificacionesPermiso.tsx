"use client";

import { useState, useMemo } from "react";
import { ShieldAlert, Check, X, Clock, UserCheck, ChevronDown, Search, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePermisosPendientes, useResponderPermiso, type PermisoAcceso } from "@/lib/hooks/usePermisosAcceso";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// ── Tarjeta de una solicitud individual ───────────────────────────
function SolicitudCard({
  permiso,
  onResponder,
  isPending,
}: {
  permiso: PermisoAcceso;
  onResponder: (id: string, accion: "aprobado" | "rechazado") => void;
  isPending: boolean;
}) {
  return (
    <div className="p-3 bg-white/4 rounded-xl border border-white/8">
      {/* Quién pide */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-6 h-6 rounded-full bg-secondary/60 border border-white/15 flex items-center justify-center shrink-0">
          <User className="w-3 h-3 text-white/60" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/90 truncate">
            {permiso.solicitado_por_nombre}
          </p>
          <p className="text-[10px] text-white/35 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 shrink-0" />
            {formatDistanceToNow(new Date(permiso.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-1.5">
        <button
          onClick={() => onResponder(permiso.id, "aprobado")}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[11px] font-semibold border border-emerald-500/30 transition-colors disabled:opacity-50"
        >
          <Check className="w-3 h-3" />
          Aprobar
        </button>
        <button
          onClick={() => onResponder(permiso.id, "rechazado")}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[11px] font-semibold border border-red-500/25 transition-colors disabled:opacity-50"
        >
          <X className="w-3 h-3" />
          Rechazar
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────
export function NotificacionesPermiso() {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState("");
  const { data: pendientes = [] } = usePermisosPendientes();
  const { mutate: responder, isPending } = useResponderPermiso();

  const count = pendientes.length;

  // Filtrar por nombre de paciente o de solicitante
  const filtrados = useMemo(() => {
    if (!search.trim()) return pendientes;
    const q = search.trim().toLowerCase();
    return pendientes.filter(
      (p) =>
        p.paciente_nombre.toLowerCase().includes(q) ||
        p.solicitado_por_nombre.toLowerCase().includes(q)
    );
  }, [pendientes, search]);

  // Agrupar por paciente
  const grupos = useMemo(() => {
    const map = new Map<string, { pacienteNombre: string; solicitudes: PermisoAcceso[] }>();
    for (const p of filtrados) {
      if (!map.has(p.paciente_id)) {
        map.set(p.paciente_id, { pacienteNombre: p.paciente_nombre, solicitudes: [] });
      }
      map.get(p.paciente_id)!.solicitudes.push(p);
    }
    return Array.from(map.values());
  }, [filtrados]);

  return (
    <div className="px-4 mb-2">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm group ${
          open ? "bg-primary/20 text-white" : "text-white/55 hover:bg-white/6 hover:text-white/90"
        }`}
      >
        <div className="relative shrink-0">
          <ShieldAlert className={`w-[18px] h-[18px] transition-colors ${open ? "text-primary" : "text-white/40 group-hover:text-white/70"}`} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center leading-none animate-pulse">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </div>
        <span className="flex-1 text-left text-sm">Solicitudes de acceso</span>
        {count > 0 && (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-full shrink-0">
            {count}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180 text-primary" : "text-white/25"}`} />
      </button>

      {/* Panel expandible inline */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-white/10 bg-white/5 overflow-hidden">

              {/* Sin solicitudes */}
              {count === 0 && (
                <div className="py-7 text-center">
                  <UserCheck className="w-7 h-7 text-white/20 mx-auto mb-2" />
                  <p className="text-xs text-white/30">Sin solicitudes pendientes</p>
                </div>
              )}

              {/* Con solicitudes */}
              {count > 0 && (
                <>
                  {/* Buscador */}
                  <div className="px-3 pt-3 pb-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar paciente o solicitante…"
                        className="w-full bg-white/8 border border-white/12 rounded-lg pl-7 pr-3 py-2 text-[11px] text-white/80 placeholder:text-white/25 focus:outline-none focus:border-primary/50 focus:bg-white/12 transition-all"
                      />
                    </div>
                  </div>

                  {/* Grupos */}
                  <div className="px-3 pb-3 space-y-3 max-h-[45vh] overflow-y-auto overscroll-contain">
                    {grupos.length === 0 && (
                      <p className="text-xs text-white/30 text-center py-4">
                        Sin resultados para &ldquo;{search}&rdquo;
                      </p>
                    )}

                    {grupos.map((grupo) => (
                      <div key={grupo.pacienteNombre}>
                        {/* Cabecera del grupo: nombre del paciente */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-full bg-primary/25 border border-primary/40 flex items-center justify-center shrink-0">
                            <span className="text-[8px] font-bold text-primary">
                              {grupo.pacienteNombre.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-white/80 truncate flex-1">
                            {grupo.pacienteNombre}
                          </p>
                          {grupo.solicitudes.length > 1 && (
                            <span className="text-[9px] text-white/40 bg-white/8 px-1.5 py-0.5 rounded-full shrink-0">
                              {grupo.solicitudes.length} solicitudes
                            </span>
                          )}
                        </div>

                        {/* Solicitudes del grupo */}
                        <div className="space-y-2 pl-1">
                          {grupo.solicitudes.map((s) => (
                            <SolicitudCard
                              key={s.id}
                              permiso={s}
                              onResponder={(id, accion) => responder({ id, accion })}
                              isPending={isPending}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
