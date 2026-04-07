"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export type PermisoAcceso = {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  solicitado_por: string;
  solicitado_por_nombre: string;
  aprobado_por: string | null;
  estado: "pendiente" | "aprobado" | "rechazado";
  fecha_expira: string;
  created_at: string;
  updated_at: string;
};

function hoy() {
  return new Date().toISOString().split("T")[0];
}

// ── Permiso aprobado y vigente para un paciente (recepcion) ───────
export function usePermisoActivo(pacienteId: string, enabled = true) {
  return useQuery({
    queryKey: ["permiso-activo", pacienteId],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("permisos_acceso")
        .select("*")
        .eq("paciente_id", pacienteId)
        .eq("solicitado_por", user.id)
        .eq("estado", "aprobado")
        .gte("fecha_expira", hoy())
        .maybeSingle();

      return data as PermisoAcceso | null;
    },
    enabled: enabled && !!pacienteId,
    staleTime: 60 * 1000,
  });
}

// ── Solicitud pendiente del usuario actual para un paciente ───────
export function useSolicitudPendiente(pacienteId: string) {
  return useQuery({
    queryKey: ["permiso-pendiente", pacienteId],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("permisos_acceso")
        .select("*")
        .eq("paciente_id", pacienteId)
        .eq("solicitado_por", user.id)
        .eq("estado", "pendiente")
        .maybeSingle();

      return data as PermisoAcceso | null;
    },
    enabled: !!pacienteId,
    // Poll frecuente mientras hay solicitud pendiente (se para cuando se aprueba)
    refetchInterval: (query) => (query.state.data ? 3000 : false),
  });
}

// ── Solicitudes pendientes (vista de la doctora) ──────────────────
export function usePermisosPendientes() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["permisos-pendientes"],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("permisos_acceso")
        .select("*")
        .eq("estado", "pendiente")
        .order("created_at", { ascending: false });

      return (data ?? []) as PermisoAcceso[];
    },
    staleTime: 10 * 1000,
  });

  // Realtime: escuchar INSERT en permisos_acceso
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("permisos-nuevos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "permisos_acceso" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["permisos-pendientes"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

// ── Solicitar acceso a un paciente ────────────────────────────────
export function useSolicitarAcceso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pacienteId,
      pacienteNombre,
    }: {
      pacienteId: string;
      pacienteNombre: string;
    }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Si ya existe una solicitud pendiente o aprobada para hoy, devolverla
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from("permisos_acceso")
        .select("*")
        .eq("paciente_id", pacienteId)
        .eq("solicitado_por", user.id)
        .in("estado", ["pendiente", "aprobado"])
        .gte("fecha_expira", hoy())
        .maybeSingle();

      if (existing) return existing as PermisoAcceso;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("permisos_acceso")
        .insert({
          paciente_id: pacienteId,
          paciente_nombre: pacienteNombre,
          solicitado_por: user.id,
          solicitado_por_nombre: profile?.full_name ?? "Recepción",
          fecha_expira: hoy(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as PermisoAcceso;
    },
    onSuccess: (_, { pacienteId }) => {
      queryClient.invalidateQueries({ queryKey: ["permiso-pendiente", pacienteId] });
      queryClient.invalidateQueries({ queryKey: ["permisos-pendientes"] });
    },
    onError: (err: Error) => toast.error("Error al solicitar acceso: " + err.message),
  });
}

// ── Aprobar o rechazar solicitud (doctora) ────────────────────────
export function useResponderPermiso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      accion,
    }: {
      id: string;
      accion: "aprobado" | "rechazado";
    }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("permisos_acceso")
        .update({ estado: accion, aprobado_por: user?.id })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { accion }) => {
      queryClient.invalidateQueries({ queryKey: ["permisos-pendientes"] });
      toast.success(accion === "aprobado" ? "Acceso concedido" : "Solicitud rechazada");
    },
    onError: (err: Error) => toast.error("Error: " + err.message),
  });
}
