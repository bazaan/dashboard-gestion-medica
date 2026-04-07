"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RenovacionVista } from "@/types/database.types";

export type DashboardStats = {
  pacientesActivos: number;
  vencidos: number;
  proximosVencer: number;       // todos los proximo_vencer (30 días)
  proximosVencer7: number;      // solo los ≤ 7 días
  procedimientosActivos: number;
  urgentes: RenovacionVista[];  // vencidos + ≤7 días, top 6 para mostrar en panel
  needsMigration: boolean;
};

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const supabase = createClient();

      // Lanzar las 3 queries en paralelo
      const [pacientesRes, renovacionesRes, procedimientosRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("pacientes")
          .select("*", { count: "exact", head: true })
          .neq("estado", "inactivo"),

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("renovaciones_vista")
          .select("id, paciente_id, paciente_nombre, paciente_telefono, tratamiento_nombre, categoria, estado_actual, dias_para_vencer, fecha_vencimiento"),

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("tratamientos_catalogo")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

      // Si renovaciones_vista no existe aún (migración pendiente)
      const needsMigration =
        renovacionesRes.error?.code === "PGRST200" ||
        renovacionesRes.error?.code === "42P01";

      const rens: RenovacionVista[] = needsMigration ? [] : (renovacionesRes.data ?? []);

      const vencidos      = rens.filter((r) => r.estado_actual === "vencido");
      const proximosVencer = rens.filter((r) => r.estado_actual === "proximo_vencer");
      const proximos7     = proximosVencer.filter((r) => (r.dias_para_vencer ?? 999) <= 7);

      // Urgentes: vencidos primero, luego por vencer en 7 días, hasta 6
      const urgentes = [
        ...vencidos.sort((a, b) => (a.dias_para_vencer ?? -999) - (b.dias_para_vencer ?? -999)),
        ...proximos7.sort((a, b) => (a.dias_para_vencer ?? 0) - (b.dias_para_vencer ?? 0)),
      ].slice(0, 6);

      return {
        pacientesActivos:     pacientesRes.count   ?? 0,
        vencidos:             vencidos.length,
        proximosVencer:       proximosVencer.length,
        proximosVencer7:      proximos7.length,
        procedimientosActivos: procedimientosRes.count ?? 0,
        urgentes,
        needsMigration,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 min — es un panel, no necesita ser tiempo real
    refetchOnWindowFocus: true,
  });
}
