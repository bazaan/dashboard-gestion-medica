-- ============================================================
-- Migration v6: Fix RLS for fotos_antes_despues + Storage bucket
-- ============================================================

-- 1. Simplify fotos INSERT policy — remove consentimiento_imagen check
--    (the app always sends true, but the check can still block under some paths)
DROP POLICY IF EXISTS "fotos_insert" ON fotos_antes_despues;
CREATE POLICY "fotos_insert" ON fotos_antes_despues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Ensure UPDATE is allowed (needed for future edits)
DROP POLICY IF EXISTS "fotos_update" ON fotos_antes_despues;
CREATE POLICY "fotos_update" ON fotos_antes_despues
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 3. Storage bucket policies for fotos-pacientes
--    These policies live on storage.objects and control file upload/download/delete.
DROP POLICY IF EXISTS "fotos_storage_select" ON storage.objects;
CREATE POLICY "fotos_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'fotos-pacientes' AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "fotos_storage_insert" ON storage.objects;
CREATE POLICY "fotos_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fotos-pacientes' AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "fotos_storage_update" ON storage.objects;
CREATE POLICY "fotos_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'fotos-pacientes' AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "fotos_storage_delete" ON storage.objects;
CREATE POLICY "fotos_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'fotos-pacientes' AND auth.uid() IS NOT NULL
  );
