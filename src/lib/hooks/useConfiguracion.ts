"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Profile, UserRole } from "@/types/database.types";

// ── Usuarios del sistema ──────────────────────────────────────
export function useUsuarios() {
  return useQuery({
    queryKey: ["configuracion", "usuarios"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useActualizarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from("profiles")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["configuracion", "usuarios"] });
      toast.success("Usuario actualizado");
    },
    onError: () => toast.error("Error al actualizar usuario"),
  });
}

export function useDesactivarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      qc.invalidateQueries({ queryKey: ["configuracion", "usuarios"] });
      toast.success(is_active ? "Usuario activado" : "Usuario desactivado");
    },
    onError: () => toast.error("Error al cambiar estado del usuario"),
  });
}

// ── Audit log ─────────────────────────────────────────────────
export function useAuditLog(limit = 50) {
  return useQuery({
    queryKey: ["configuracion", "audit-log", limit],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Array<{
        id: string;
        user_id: string | null;
        action: string;
        resource: string;
        resource_id: string | null;
        ip_address: string | null;
        created_at: string;
      }>;
    },
  });
}
