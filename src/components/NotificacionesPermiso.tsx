"use client";

import { useState } from "react";
import { ShieldAlert, Check, X, Clock, UserCheck, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePermisosPendientes, useResponderPermiso } from "@/lib/hooks/usePermisosAcceso";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function NotificacionesPermiso() {
  const [open, setOpen] = useState(false);
  const { data: pendientes = [] } = usePermisosPendientes();
  const { mutate: responder, isPending } = useResponderPermiso();

  const count = pendientes.length;

  return (
    <div className="px-4 mb-2">
      {/* Botón trigger — mismo estilo que los nav links */}
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

      {/* Lista expandible inline — no dropdown, evita clipping del sidebar */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              {count === 0 ? (
                <div className="py-6 text-center">
                  <UserCheck className="w-7 h-7 text-white/20 mx-auto mb-2" />
                  <p className="text-xs text-white/30">Sin solicitudes pendientes</p>
                </div>
              ) : (
                <div className="divide-y divide-white/8">
                  {pendientes.map((p) => (
                    <div key={p.id} className="p-3">
                      {/* Info de la solicitud */}
                      <div className="flex items-start gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Clock className="w-3 h-3 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/90 leading-snug">
                            {p.solicitado_por_nombre}
                          </p>
                          <p className="text-[11px] text-white/50 leading-snug mt-0.5">
                            solicita ver a{" "}
                            <span className="text-white/80 font-medium">{p.paciente_nombre}</span>
                          </p>
                          <p className="text-[10px] text-white/30 mt-1">
                            {formatDistanceToNow(new Date(p.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Botones */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => responder({ id: p.id, accion: "aprobado" })}
                          disabled={isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => responder({ id: p.id, accion: "rechazado" })}
                          disabled={isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold border border-red-500/25 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
