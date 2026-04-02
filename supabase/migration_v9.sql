-- ============================================================
-- Migration v9: Allow recepcion to create and edit catalog procedures
-- ============================================================

DROP POLICY IF EXISTS "tratamientos_insert" ON tratamientos_catalogo;
CREATE POLICY "tratamientos_insert" ON tratamientos_catalogo
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "tratamientos_update" ON tratamientos_catalogo;
CREATE POLICY "tratamientos_update" ON tratamientos_catalogo
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- DELETE stays restricted to admin only
DROP POLICY IF EXISTS "tratamientos_delete" ON tratamientos_catalogo;
CREATE POLICY "tratamientos_delete" ON tratamientos_catalogo
  FOR DELETE USING (get_my_role() = 'admin');
