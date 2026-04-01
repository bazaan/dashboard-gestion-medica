"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Tratamiento } from "@/types/database.types";

export function useProcedimientos() {
  return useQuery({
    queryKey: ["procedimientos"],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("tratamientos_catalogo")
        .select("*")
        .order("categoria")
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as Tratamiento[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type ProcedimientoPayload = {
  nombre: string;
  categoria: string;
  duracion_minutos: number;
  precio_base: number | null;
  vigencia_tipo: "permanente" | "fija" | "recurrente";
  duracion_vigencia_meses: number | null;
  intervalo_recordatorio_dias: number | null;
  sesiones_por_ciclo: number;
  es_permanente: boolean;
  requiere_evaluacion_previa: boolean;
  descripcion: string;
  is_active: boolean;
};

export function useCrearProcedimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProcedimientoPayload) => {
      const supabase = createClient();
      const codigo = payload.nombre
        .toUpperCase()
        .replace(/\s+/g, "-")
        .replace(/[^A-Z0-9-]/g, "")
        .slice(0, 10) + "-" + Date.now().toString().slice(-4);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("tratamientos_catalogo")
        .insert({
          nombre:                      payload.nombre,
          codigo,
          categoria:                   payload.categoria,
          duracion_minutos:            payload.duracion_minutos,
          precio_base:                 payload.precio_base,
          duracion_vigencia_meses:     payload.vigencia_tipo === "fija"       ? payload.duracion_vigencia_meses    : null,
          intervalo_recordatorio_dias: payload.vigencia_tipo === "recurrente" ? payload.intervalo_recordatorio_dias : null,
          sesiones_por_ciclo:          payload.sesiones_por_ciclo,
          es_permanente:               payload.vigencia_tipo === "permanente",
          requiere_evaluacion_previa:  payload.requiere_evaluacion_previa,
          descripcion:                 payload.descripcion || null,
          is_active:                   payload.is_active,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedimientos"] });
      queryClient.invalidateQueries({ queryKey: ["tratamientos_catalogo"] });
      toast.success("Procedimiento creado");
    },
    onError: (err: Error) => toast.error("Error: " + err.message),
  });
}

export function useEditarProcedimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ProcedimientoPayload }) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("tratamientos_catalogo")
        .update({
          nombre:                      payload.nombre,
          categoria:                   payload.categoria,
          duracion_minutos:            payload.duracion_minutos,
          precio_base:                 payload.precio_base,
          duracion_vigencia_meses:     payload.vigencia_tipo === "fija"       ? payload.duracion_vigencia_meses    : null,
          intervalo_recordatorio_dias: payload.vigencia_tipo === "recurrente" ? payload.intervalo_recordatorio_dias : null,
          sesiones_por_ciclo:          payload.sesiones_por_ciclo,
          es_permanente:               payload.vigencia_tipo === "permanente",
          requiere_evaluacion_previa:  payload.requiere_evaluacion_previa,
          descripcion:                 payload.descripcion || null,
          is_active:                   payload.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedimientos"] });
      queryClient.invalidateQueries({ queryKey: ["tratamientos_catalogo"] });
      toast.success("Procedimiento actualizado");
    },
    onError: (err: Error) => toast.error("Error: " + err.message),
  });
}

export function useEliminarProcedimiento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("tratamientos_catalogo")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedimientos"] });
      queryClient.invalidateQueries({ queryKey: ["tratamientos_catalogo"] });
      toast.success("Procedimiento eliminado");
    },
    onError: (err: Error) => {
      if (err.message.includes("foreign key") || err.message.includes("violates")) {
        toast.error("No se puede eliminar: el procedimiento tiene consultas o seguimientos asociados. Desactívalo en su lugar.");
      } else {
        toast.error("Error: " + err.message);
      }
    },
  });
}
