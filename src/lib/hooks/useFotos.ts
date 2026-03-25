"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface FotoConUrl {
  id: string;
  paciente_id: string;
  storage_path: string;
  tipo: "antes" | "despues" | "seguimiento";
  angulo: string | null;
  zona: string | null;
  descripcion: string | null;
  fecha_foto: string;
  evolucion_id: string | null;
  url: string | null;
  created_at: string;
}

export interface UploadFotoPayload {
  pacienteId: string;
  file: File;
  tipo: "antes" | "despues" | "seguimiento";
  angulo?: string;
  zona?: string;
  descripcion?: string;
  fecha_foto: string;
}

async function fetchFotosConUrls(pacienteId: string): Promise<FotoConUrl[]> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fotos, error } = await (supabase as any)
    .from("fotos_antes_despues")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("fecha_foto", { ascending: false });

  if (error) throw error;
  if (!fotos || fotos.length === 0) return [];

  const fotosConUrls = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fotos as any[]).map(async (foto) => {
      const { data } = await supabase.storage
        .from("fotos-pacientes")
        .createSignedUrl(foto.storage_path, 3600);
      return { ...foto, url: data?.signedUrl ?? null } as FotoConUrl;
    })
  );

  return fotosConUrls;
}

export function useFotos(pacienteId: string) {
  return useQuery({
    queryKey: ["fotos", pacienteId],
    queryFn: () => fetchFotosConUrls(pacienteId),
    enabled: !!pacienteId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadFoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UploadFotoPayload) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sin sesión activa");

      const ext = payload.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const storagePath = `${payload.pacienteId}/${Date.now()}-${payload.tipo}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("fotos-pacientes")
        .upload(storagePath, payload.file, {
          contentType: payload.file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase as any).from("fotos_antes_despues").insert({
        paciente_id: payload.pacienteId,
        storage_path: storagePath,
        tipo: payload.tipo,
        angulo: payload.angulo ?? null,
        zona: payload.zona ?? null,
        descripcion: payload.descripcion ?? null,
        fecha_foto: payload.fecha_foto,
        consentimiento_imagen: true,
        subida_por: user.id,
      });

      if (dbError) {
        await supabase.storage.from("fotos-pacientes").remove([storagePath]);
        throw dbError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fotos", variables.pacienteId] });
      toast.success("Foto subida correctamente");
    },
    onError: (err: Error) => {
      toast.error("Error al subir foto: " + err.message);
    },
  });
}

export function useDeleteFoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storagePath, pacienteId }: { id: string; storagePath: string; pacienteId: string }) => {
      const supabase = createClient();
      await supabase.storage.from("fotos-pacientes").remove([storagePath]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("fotos_antes_despues").delete().eq("id", id);
      if (error) throw error;
      return pacienteId;
    },
    onSuccess: (pacienteId) => {
      queryClient.invalidateQueries({ queryKey: ["fotos", pacienteId] });
      toast.success("Foto eliminada");
    },
    onError: (err: Error) => toast.error("Error: " + err.message),
  });
}

// Agrupar fotos por mes para el timeline
export function agruparPorMes(fotos: FotoConUrl[]) {
  const grupos: Record<string, FotoConUrl[]> = {};
  fotos.forEach((foto) => {
    const fecha = new Date(foto.fecha_foto);
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(foto);
  });
  return Object.entries(grupos).sort(([a], [b]) => b.localeCompare(a));
}
