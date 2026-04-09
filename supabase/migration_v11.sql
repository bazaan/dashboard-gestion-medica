-- ============================================================
-- migration_v11.sql — Abrir acceso a expedientes para todos los roles
-- El teléfono se protege solo a nivel de aplicación.
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- historias_clinicas: acceso a todos los usuarios autenticados
DROP POLICY IF EXISTS "historias_select" ON historias_clinicas;
CREATE POLICY "historias_select" ON historias_clinicas
  FOR SELECT USING (get_my_role() IN ('admin', 'doctor', 'recepcion'));

-- evoluciones_clinicas: acceso a todos los usuarios autenticados
DROP POLICY IF EXISTS "evoluciones_select" ON evoluciones_clinicas;
CREATE POLICY "evoluciones_select" ON evoluciones_clinicas
  FOR SELECT USING (get_my_role() IN ('admin', 'doctor', 'recepcion'));

-- fotos_antes_despues: acceso a todos los usuarios autenticados
DROP POLICY IF EXISTS "fotos_select" ON fotos_antes_despues;
CREATE POLICY "fotos_select" ON fotos_antes_despues
  FOR SELECT USING (get_my_role() IN ('admin', 'doctor', 'recepcion'));
