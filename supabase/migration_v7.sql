-- ============================================================
-- Migration v7: Full recepcion write access
-- ============================================================

-- historias_clinicas: recepcion puede crear y editar
DROP POLICY IF EXISTS "historias_insert" ON historias_clinicas;
CREATE POLICY "historias_insert" ON historias_clinicas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "historias_update" ON historias_clinicas;
CREATE POLICY "historias_update" ON historias_clinicas
  FOR UPDATE USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- evoluciones_clinicas: recepcion puede editar (si no está firmada)
DROP POLICY IF EXISTS "evoluciones_update" ON evoluciones_clinicas;
CREATE POLICY "evoluciones_update" ON evoluciones_clinicas
  FOR UPDATE USING  (is_locked = FALSE AND auth.uid() IS NOT NULL)
  WITH CHECK (is_locked = FALSE AND auth.uid() IS NOT NULL);

-- evoluciones_clinicas: recepcion puede insertar
DROP POLICY IF EXISTS "evoluciones_insert" ON evoluciones_clinicas;
CREATE POLICY "evoluciones_insert" ON evoluciones_clinicas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- procedimientos_consulta: cualquier usuario autenticado
DROP POLICY IF EXISTS "proc_consulta_insert" ON procedimientos_consulta;
CREATE POLICY "proc_consulta_insert" ON procedimientos_consulta
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "proc_consulta_delete" ON procedimientos_consulta;
CREATE POLICY "proc_consulta_delete" ON procedimientos_consulta
  FOR DELETE USING (auth.uid() IS NOT NULL);
