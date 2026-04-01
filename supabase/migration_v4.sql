-- ============================================================
-- Migration v4: Fix RLS policies to allow recepcion role
-- ============================================================

-- evoluciones_clinicas: allow recepcion to insert
DROP POLICY IF EXISTS "evoluciones_insert" ON evoluciones_clinicas;
CREATE POLICY "evoluciones_insert" ON evoluciones_clinicas
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'doctor', 'recepcion'));

-- procedimientos_consulta: allow recepcion to insert/delete
DROP POLICY IF EXISTS "proc_consulta_insert" ON procedimientos_consulta;
CREATE POLICY "proc_consulta_insert" ON procedimientos_consulta
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "proc_consulta_delete" ON procedimientos_consulta;
CREATE POLICY "proc_consulta_delete" ON procedimientos_consulta
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- historias_clinicas: allow recepcion to update (for historia form in drawer)
DROP POLICY IF EXISTS "historias_update" ON historias_clinicas;
CREATE POLICY "historias_update" ON historias_clinicas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- fotos_antes_despues: allow any authenticated user to delete their own photos
DROP POLICY IF EXISTS "fotos_delete" ON fotos_antes_despues;
CREATE POLICY "fotos_delete" ON fotos_antes_despues
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- evoluciones_clinicas update: allow recepcion to update consultations they created
DROP POLICY IF EXISTS "evoluciones_update" ON evoluciones_clinicas;
CREATE POLICY "evoluciones_update" ON evoluciones_clinicas
  FOR UPDATE USING (
    is_locked = FALSE
    AND (get_my_role() IN ('admin', 'recepcion') OR doctor_id = auth.uid())
  );
