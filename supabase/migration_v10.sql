-- ============================================================
-- migration_v10.sql — Sistema de permisos de acceso a pacientes
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Tabla de permisos de acceso ───────────────────────────────

CREATE TABLE IF NOT EXISTS permisos_acceso (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id           UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  paciente_nombre       TEXT NOT NULL,
  solicitado_por        UUID NOT NULL REFERENCES profiles(id),
  solicitado_por_nombre TEXT NOT NULL,
  aprobado_por          UUID REFERENCES profiles(id),
  estado                TEXT NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  -- El acceso expira al final del día (medianoche Lima)
  fecha_expira          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permisos_paciente    ON permisos_acceso(paciente_id);
CREATE INDEX IF NOT EXISTS idx_permisos_solicitante ON permisos_acceso(solicitado_por);
CREATE INDEX IF NOT EXISTS idx_permisos_estado      ON permisos_acceso(estado);

CREATE TRIGGER trg_permisos_updated_at
  BEFORE UPDATE ON permisos_acceso
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. RLS de la nueva tabla ──────────────────────────────────────

ALTER TABLE permisos_acceso ENABLE ROW LEVEL SECURITY;

-- Doctor y admin: acceso total (ver, aprobar, rechazar)
CREATE POLICY "permisos_admin_doctor_all" ON permisos_acceso
  FOR ALL USING (get_my_role() IN ('admin', 'doctor'));

-- Recepcion: solo puede ver y crear sus propias solicitudes
CREATE POLICY "permisos_recepcion_select" ON permisos_acceso
  FOR SELECT USING (solicitado_por = auth.uid());

CREATE POLICY "permisos_recepcion_insert" ON permisos_acceso
  FOR INSERT WITH CHECK (
    solicitado_por = auth.uid()
    AND get_my_role() = 'recepcion'
  );

-- ── 3. Actualizar RLS en tablas de registros médicos ─────────────
-- Recepcion necesita permiso aprobado y vigente para acceder.
-- Admin/doctor siempre pueden acceder.

-- historias_clinicas
DROP POLICY IF EXISTS "historias_select" ON historias_clinicas;
CREATE POLICY "historias_select" ON historias_clinicas
  FOR SELECT USING (
    get_my_role() IN ('admin', 'doctor')
    OR EXISTS (
      SELECT 1 FROM permisos_acceso
       WHERE paciente_id = historias_clinicas.paciente_id
         AND solicitado_por = auth.uid()
         AND estado = 'aprobado'
         AND fecha_expira >= CURRENT_DATE
    )
  );

-- evoluciones_clinicas
DROP POLICY IF EXISTS "evoluciones_select" ON evoluciones_clinicas;
CREATE POLICY "evoluciones_select" ON evoluciones_clinicas
  FOR SELECT USING (
    get_my_role() IN ('admin', 'doctor')
    OR EXISTS (
      SELECT 1 FROM permisos_acceso
       WHERE paciente_id = evoluciones_clinicas.paciente_id
         AND solicitado_por = auth.uid()
         AND estado = 'aprobado'
         AND fecha_expira >= CURRENT_DATE
    )
  );

-- fotos_antes_despues
DROP POLICY IF EXISTS "fotos_select" ON fotos_antes_despues;
CREATE POLICY "fotos_select" ON fotos_antes_despues
  FOR SELECT USING (
    get_my_role() IN ('admin', 'doctor')
    OR EXISTS (
      SELECT 1 FROM permisos_acceso
       WHERE paciente_id = fotos_antes_despues.paciente_id
         AND solicitado_por = auth.uid()
         AND estado = 'aprobado'
         AND fecha_expira >= CURRENT_DATE
    )
  );

-- ── 4. Habilitar Realtime en la tabla ────────────────────────────
-- Necesario para notificaciones en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE permisos_acceso;
