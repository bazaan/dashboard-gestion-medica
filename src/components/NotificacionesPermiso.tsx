"use client";

import { useState, useRef, useEffect } from "react";
import { ShieldAlert, Check, X, Clock, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePermisosPendientes, useResponderPermiso } from "@/lib/hooks/usePermisosAcceso";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function NotificacionesPermiso() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: pendientes = [] } = usePermisosPendientes();
  const { mutate: responder, isPending } = useResponderPermiso();

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const count = pendientes.length;

  return (
    <div ref={ref} className="relative px-4 mb-2">
      {/* Botón trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm group ${
          open ? "bg-primary/20 text-white" : "text-white/55 hover:bg-white/6 hover:text-white/90"
        }`}
      >
        <div className="relative shrink-0">
          <ShieldAlert className={`w-4.5 h-4.5 transition-colors ${open ? "text-primary" : "text-white/40 group-hover:text-white/70"}`} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center leading-none animate-pulse">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </div>
        <span className="flex-1 text-left">Solicitudes de acceso</span>
        {count > 0 && (
          <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
            {count} pendiente{count > 1 ? "s" : ""}
          </span>
        )}
      </button>

      {/* Panel desplegable */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-4 right-4 top-full mt-1 z-[80] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-sm font-semibold text-foreground">Accesos pendientes</p>
            </div>

            {count === 0 ? (
              <div className="py-8 text-center">
                <UserCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Sin solicitudes pendientes</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
                {pendientes.map((p) => (
                  <div key={p.id} className="px-4 py-3.5">
                    <div className="flex items-start gap-2.5 mb-3">
                      <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-snug">
                          {p.solicitado_por_nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          solicita acceso a{" "}
                          <span className="font-semibold text-foreground">{p.paciente_nombre}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {formatDistanceToNow(new Date(p.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => responder({ id: p.id, accion: "aprobado" })}
                        disabled={isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                      <button
                        onClick={() => responder({ id: p.id, accion: "rechazado" })}
                        disabled={isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
