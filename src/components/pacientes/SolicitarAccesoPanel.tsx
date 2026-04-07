"use client";

import { useEffect } from "react";
import { ShieldAlert, Clock, CheckCircle2, XCircle, Loader2, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  useSolicitarAcceso,
  useSolicitudPendiente,
  usePermisoActivo,
} from "@/lib/hooks/usePermisosAcceso";
import type { Paciente } from "@/types/database.types";

interface Props {
  paciente: Paciente;
  onAccesoAprobado: () => void;
}

export function SolicitarAccesoPanel({ paciente, onAccesoAprobado }: Props) {
  const queryClient = useQueryClient();
  const { data: permisoActivo } = usePermisoActivo(paciente.id);
  const { data: pendiente } = useSolicitudPendiente(paciente.id);
  const { mutate: solicitar, isPending: solicitando } = useSolicitarAcceso();

  // Realtime: escuchar cuando la doctora aprueba/rechaza este permiso específico
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`permiso-paciente-${paciente.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "permisos_acceso",
          filter: `paciente_id=eq.${paciente.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["permiso-activo", paciente.id] });
          queryClient.invalidateQueries({ queryKey: ["permiso-pendiente", paciente.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [paciente.id, queryClient]);

  // Cuando se aprueba, notificar al padre para que muestre el perfil
  useEffect(() => {
    if (permisoActivo) onAccesoAprobado();
  }, [permisoActivo, onAccesoAprobado]);

  const nombreCompleto = `${paciente.nombres} ${paciente.apellidos}`;

  // ── Estado: aprobado (por si llega antes del useEffect) ──────────
  if (permisoActivo) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Acceso concedido</p>
          <p className="text-xs text-muted-foreground mt-1">Cargando perfil…</p>
        </div>
      </div>
    );
  }

  // ── Estado: solicitud pendiente ───────────────────────────────────
  if (pendiente) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="card-premium max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
            Esperando autorización
          </h3>
          <p className="text-sm text-muted-foreground mb-1">
            Tu solicitud para acceder al perfil de
          </p>
          <p className="font-semibold text-foreground mb-4">{nombreCompleto}</p>
          <p className="text-sm text-muted-foreground mb-6">
            fue enviada a la <span className="text-primary font-semibold">Dra. Dennisse Arroyo</span>.
            Recibirás acceso en cuanto ella lo apruebe.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            Verificando respuesta…
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-4">
            El acceso será válido hasta el final del día de hoy.
          </p>
        </div>
      </div>
    );
  }

  // ── Estado: sin solicitud — mostrar pantalla de acceso bloqueado ──
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="card-premium max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary/8 border-2 border-secondary/20 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-secondary" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
          Acceso restringido
        </h3>
        <p className="text-sm text-muted-foreground mb-1">
          Para ver el expediente clínico de
        </p>
        <p className="font-semibold text-foreground mb-4">{nombreCompleto}</p>
        <p className="text-sm text-muted-foreground mb-6">
          necesitas autorización de la <span className="text-primary font-semibold">Dra. Dennisse Arroyo</span>.
          Se le enviará una notificación de inmediato.
        </p>

        <button
          onClick={() => solicitar({ pacienteId: paciente.id, pacienteNombre: nombreCompleto })}
          disabled={solicitando}
          className="btn-primary w-full justify-center gap-2"
        >
          {solicitando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldAlert className="w-4 h-4" />
          )}
          {solicitando ? "Enviando solicitud…" : "Solicitar acceso"}
        </button>

        <div className="mt-5 flex items-start gap-2.5 bg-muted/60 rounded-xl p-3.5 text-left">
          <XCircle className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Esta medida protege la privacidad de los pacientes. El acceso aprobado
            es válido durante el día completo.
          </p>
        </div>
      </div>
    </div>
  );
}
