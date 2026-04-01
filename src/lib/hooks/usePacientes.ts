"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Paciente, PacienteEstado } from "@/types/database.types";

// ── Lista de pacientes con búsqueda ───────────────────────────
export function usePacientes(search?: string) {
  return useQuery({
    queryKey: ["pacientes", search ?? ""],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("pacientes")
        .select("*")
        .order("updated_at", { ascending: false });

      if (search && search.trim().length > 0) {
        const term = search.trim();
        query = query.or(
          `nombres.ilike.%${term}%,apellidos.ilike.%${term}%,dni.ilike.%${term}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Paciente[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ── Paciente individual por ID ─────────────────────────────────
export function usePaciente(id: string) {
  return useQuery({
    queryKey: ["paciente", id],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("pacientes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Paciente;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Editar datos del paciente ─────────────────────────────────
export function useEditarPaciente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Paciente> }) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("pacientes")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: ["paciente", id] });
      toast.success("Paciente actualizado correctamente");
    },
    onError: (err: Error) => toast.error("Error: " + err.message),
  });
}

// ── Eliminar paciente ─────────────────────────────────────────
export function useEliminarPaciente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("pacientes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      toast.success("Paciente eliminado");
    },
    onError: (err: Error) => toast.error("Error: " + err.message),
  });
}

// ── Actualizar estado del paciente ────────────────────────────
export function useActualizarEstadoPaciente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: PacienteEstado }) => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("pacientes")
        .update({ estado })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: ["paciente", id] });
      toast.success("Estado actualizado");
    },
    onError: (err: Error) => toast.error("Error: " + err.message),
  });
}

// ── Helpers de UI ─────────────────────────────────────────────
export function getInitials(nombres: string, apellidos: string): string {
  return `${nombres[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();
}

export function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}
