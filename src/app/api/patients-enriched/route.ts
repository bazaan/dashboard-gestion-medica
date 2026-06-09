import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/patients-enriched
 * Returns procedimientos + renovacion status for all patients.
 * Uses service_role to bypass RLS.
 * Returns: { [paciente_id]: { procedimientos: string[], renovacion: { estado, dias } | null } }
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    // 1. Get all procedimientos per patient (via evoluciones)
    const { data: procs } = await supabase
      .from("procedimientos_consulta")
      .select("tratamiento_id, evolucion:evoluciones_clinicas!inner(paciente_id)");

    // 2. Get tratamiento names
    const { data: tratamientos } = await supabase
      .from("tratamientos_catalogo")
      .select("id, nombre");

    const tratMap: Record<string, string> = {};
    (tratamientos || []).forEach((t: any) => { tratMap[t.id] = t.nombre; });

    // Build procedimientos per patient
    const procsByPatient: Record<string, Set<string>> = {};
    (procs || []).forEach((p: any) => {
      const pacId = p.evolucion?.paciente_id;
      const tratName = tratMap[p.tratamiento_id] || "";
      if (pacId && tratName) {
        if (!procsByPatient[pacId]) procsByPatient[pacId] = new Set();
        procsByPatient[pacId].add(tratName);
      }
    });

    // 3. Get renovacion status from renovaciones_vista
    const { data: renovaciones } = await supabase
      .from("renovaciones_vista")
      .select("paciente_id, estado, dias_restantes, nombre_tratamiento");

    const renoByPatient: Record<string, { estado: string; dias: number | null; tratamiento: string }[]> = {};
    (renovaciones || []).forEach((r: any) => {
      if (!renoByPatient[r.paciente_id]) renoByPatient[r.paciente_id] = [];
      renoByPatient[r.paciente_id].push({
        estado: r.estado,
        dias: r.dias_restantes,
        tratamiento: r.nombre_tratamiento || "",
      });
    });

    // 4. Merge into result
    const allPatientIds = new Set([...Object.keys(procsByPatient), ...Object.keys(renoByPatient)]);
    const result: Record<string, {
      procedimientos: string[];
      renovaciones: { estado: string; dias: number | null; tratamiento: string }[];
    }> = {};

    allPatientIds.forEach(id => {
      result[id] = {
        procedimientos: [...(procsByPatient[id] || [])],
        renovaciones: renoByPatient[id] || [],
      };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
