-- ============================================================
-- Migration v8: Fix trigger functions for Supabase RLS compatibility
--
-- In Supabase, SECURITY DEFINER functions without SET search_path
-- can lose the auth context and fail RLS checks on tables they
-- read/write (tratamientos_catalogo, seguimientos_renovacion, etc.).
-- Adding SET search_path = public fixes this.
-- ============================================================

CREATE OR REPLACE FUNCTION crear_seguimiento_renovacion()
RETURNS TRIGGER AS $$
DECLARE
  v_tratamiento  tratamientos_catalogo%ROWTYPE;
  v_evolucion    evoluciones_clinicas%ROWTYPE;
  fecha_venc     DATE;
BEGIN
  SELECT * INTO v_tratamiento FROM tratamientos_catalogo WHERE id = NEW.tratamiento_id;
  SELECT * INTO v_evolucion   FROM evoluciones_clinicas   WHERE id = NEW.evolucion_id;

  IF v_tratamiento.es_permanente THEN
    fecha_venc := NULL;
  ELSIF v_tratamiento.intervalo_recordatorio_dias IS NOT NULL THEN
    fecha_venc := DATE(v_evolucion.fecha_atencion) + v_tratamiento.intervalo_recordatorio_dias;
  ELSIF v_tratamiento.duracion_vigencia_meses IS NOT NULL THEN
    fecha_venc := (DATE(v_evolucion.fecha_atencion)
                  + (v_tratamiento.duracion_vigencia_meses || ' months')::INTERVAL)::DATE;
  ELSE
    fecha_venc := NULL;
  END IF;

  INSERT INTO seguimientos_renovacion (
    paciente_id, tratamiento_id, evolucion_id,
    procedimiento_consulta_id, fecha_realizacion, fecha_vencimiento, estado
  ) VALUES (
    v_evolucion.paciente_id, NEW.tratamiento_id, NEW.evolucion_id,
    NEW.id, DATE(v_evolucion.fecha_atencion), fecha_venc,
    CASE WHEN fecha_venc IS NULL THEN 'permanente' ELSE 'vigente' END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION crear_recordatorios_whatsapp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fecha_vencimiento IS NULL THEN
    RETURN NEW;
  END IF;

  IF (NEW.fecha_vencimiento - INTERVAL '30 days')::DATE > CURRENT_DATE THEN
    INSERT INTO recordatorios_log (seguimiento_id, paciente_id, tipo, fecha_programada)
    VALUES (NEW.id, NEW.paciente_id, '30_dias',
            (NEW.fecha_vencimiento - INTERVAL '30 days')::DATE);
  END IF;

  IF (NEW.fecha_vencimiento - INTERVAL '7 days')::DATE > CURRENT_DATE THEN
    INSERT INTO recordatorios_log (seguimiento_id, paciente_id, tipo, fecha_programada)
    VALUES (NEW.id, NEW.paciente_id, '7_dias',
            (NEW.fecha_vencimiento - INTERVAL '7 days')::DATE);
  END IF;

  INSERT INTO recordatorios_log (seguimiento_id, paciente_id, tipo, fecha_programada)
  VALUES (NEW.id, NEW.paciente_id, 'vencimiento', NEW.fecha_vencimiento);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
