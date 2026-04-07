"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { EvolucionConProcedimientos, Tratamiento } from "@/types/database.types";

// ── Consultas/evoluciones de un paciente ──────────────────────
export function useConsultas(pacienteId: string) {
  return useQuery({
    queryKey: ["consultas", pacienteId],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: historia, error: hError } = await (supabase as any)
        .from("historias_clinicas")
        .select("id")
        .eq("paciente_id", pacienteId)
        .single();

      if (hError || !historia) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("evoluciones_clinicas")
        .select(`
          *,
          procedimientos_consulta (
            id, notas, tratamiento_id,
            tratamientos_catalogo (
              nombre, categoria,
              duracion_vigencia_meses, intervalo_recordatorio_dias, es_permanente
            )
          )
        `)
        .eq("historia_id", historia.id)
        .order("fecha_atencion", { ascending: false });

      if (error) throw error;
      return (data ?? []) as EvolucionConProcedimientos[];
    },
    enabled: !!pacienteId,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Historial clínico (historia base) ─────────────────────────
export function useHistoriaClinica(pacienteId: string, enabled = true) {
  return useQuery({
    queryKey: ["historia", pacienteId],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("historias_clinicas")
        .select("*")
        .eq("paciente_id", pacienteId)
        .single();
      if (error?.code === "PGRST116") return null;
      if (error) throw error;
      return data;
    },
    enabled: !!pacienteId && enabled,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Catálogo de tratamientos para formularios ─────────────────
export function useTratamientosCatalogo() {
  return useQuery({
    queryKey: ["tratamientos_catalogo"],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("tratamientos_catalogo")
        .select("id, nombre, codigo, categoria, duracion_vigencia_meses, intervalo_recordatorio_dias, sesiones_por_ciclo, es_permanente")
        .eq("is_active", true)
        .order("categoria")
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as Tratamiento[];
    },
    staleTime: 30 * 60 * 1000, // 30 min, el catálogo cambia poco
  });
}

// ── Crear nueva consulta/evolución ────────────────────────────
export interface NuevaConsultaPayload {
  historia_id: string;
  paciente_id: string;
  doctor_id: string;
  fecha_atencion: string;
  motivo_consulta: string;
  signos_sintomas?: string;
  examen_fisico?: string;
  fur?: string;
  ram?: string;
  antecedentes?: string;
  examenes_auxiliares?: string;
  medicacion?: string;
  diagnostico?: string;
  procedimiento: string;        // texto libre resumido
  observaciones?: string;
  recomendaciones?: string;
  proxima_sesion_sugerida?: string;
  tratamiento_ids: string[];    // IDs del catálogo aplicados en esta sesión
  notas_procedimientos?: Record<string, string>; // tratamiento_id → nota
}

export function useCrearConsulta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: NuevaConsultaPayload) => {
      const supabase = createClient();

      // 1. Crear la evolución clínica
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: evolucion, error: evError } = await (supabase as any)
        .from("evoluciones_clinicas")
        .insert({
          historia_id:         payload.historia_id,
          paciente_id:         payload.paciente_id,
          doctor_id:           payload.doctor_id,
          fecha_atencion:      payload.fecha_atencion,
          motivo_consulta:     payload.motivo_consulta,
          signos_sintomas:     payload.signos_sintomas    || null,
          examen_fisico:       payload.examen_fisico      || null,
          fur:                 payload.fur                || null,
          ram:                 payload.ram                || null,
          antecedentes:        payload.antecedentes       || null,
          examenes_auxiliares: payload.examenes_auxiliares|| null,
          medicacion:          payload.medicacion         || null,
          diagnostico:         payload.diagnostico        || null,
          procedimiento:       payload.procedimiento,
          observaciones:       payload.observaciones      || null,
          recomendaciones:     payload.recomendaciones    || null,
          proxima_sesion_sugerida: payload.proxima_sesion_sugerida || null,
          productos_usados: [],
          zona_tratada: [],
        })
        .select("id")
        .single();

      if (evError) throw evError;

      // 2. Insertar procedimientos — los triggers de Supabase crean automáticamente
      //    los seguimientos_renovacion y recordatorios_log
      if (payload.tratamiento_ids.length > 0) {
        const procedimientos = payload.tratamiento_ids.map((tid) => ({
          evolucion_id:   evolucion.id,
          tratamiento_id: tid,
          notas:          payload.notas_procedimientos?.[tid] || null,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: procError } = await (supabase as any)
          .from("procedimientos_consulta")
          .insert(procedimientos);

        if (procError) throw procError;
      }

      return evolucion.id as string;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["consultas", variables.paciente_id] });
      queryClient.invalidateQueries({ queryKey: ["evoluciones", variables.historia_id] });
      queryClient.invalidateQueries({ queryKey: ["renovaciones"] });
      toast.success("Consulta registrada correctamente");
    },
    onError: (err: Error) => {
      toast.error("Error al guardar consulta: " + err.message);
    },
  });
}
