import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/patients-by-procedure?tratamiento_id=xxx
 * Returns patient IDs that had a specific procedure.
 * Uses service_role to bypass RLS on procedimientos_consulta/evoluciones_clinicas.
 */
export async function GET(req: NextRequest) {
  const tratamientoId = req.nextUrl.searchParams.get("tratamiento_id");
  if (!tratamientoId) {
    return NextResponse.json({ patient_ids: [] });
  }

  try {
    const supabase = createAdminClient();

    // Get evolucion IDs that have this tratamiento
    const { data: procs, error: e1 } = await supabase
      .from("procedimientos_consulta")
      .select("evolucion_id")
      .eq("tratamiento_id", tratamientoId);

    if (e1 || !procs || procs.length === 0) {
      return NextResponse.json({ patient_ids: [] });
    }

    const evIds = [...new Set(procs.map((p: any) => p.evolucion_id).filter(Boolean))];

    // Get paciente IDs from those evoluciones (batch in chunks)
    const allIds = new Set<string>();
    for (let i = 0; i < evIds.length; i += 100) {
      const chunk = evIds.slice(i, i + 100);
      const { data: evols } = await supabase
        .from("evoluciones_clinicas")
        .select("paciente_id")
        .in("id", chunk);
      if (evols) {
        evols.forEach((e: any) => {
          if (e.paciente_id) allIds.add(e.paciente_id);
        });
      }
    }

    return NextResponse.json({ patient_ids: [...allIds] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, patient_ids: [] }, { status: 500 });
  }
}
