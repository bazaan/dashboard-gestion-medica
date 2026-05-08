-- =============================================================
-- MIGRACION V13: Historial de campanas WA + contabilidad
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- =============================================================

-- 1. Tabla de campanas (metadata de cada envio masivo)
CREATE TABLE IF NOT EXISTS campanas_wa (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  template_name   TEXT NOT NULL,
  template_lang   TEXT NOT NULL DEFAULT 'es_PE',
  total           INT NOT NULL DEFAULT 0,
  enviados        INT NOT NULL DEFAULT 0,
  fallidos        INT NOT NULL DEFAULT 0,
  omitidos        INT NOT NULL DEFAULT 0,
  costo_estimado  NUMERIC(10,4) DEFAULT 0,
  creado_por      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Detalle por destinatario
CREATE TABLE IF NOT EXISTS campana_destinatarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id    UUID NOT NULL REFERENCES campanas_wa(id) ON DELETE CASCADE,
  paciente_id   UUID NOT NULL REFERENCES pacientes(id),
  nombre        TEXT NOT NULL,
  telefono      TEXT,
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviado','fallido','omitido')),
  error_msg     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camp_dest_campana ON campana_destinatarios(campana_id);

-- 3. RLS
ALTER TABLE campanas_wa ENABLE ROW LEVEL SECURITY;
ALTER TABLE campana_destinatarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campanas_select" ON campanas_wa
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "campanas_insert" ON campanas_wa
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "campanas_update" ON campanas_wa
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "camp_dest_select" ON campana_destinatarios
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "camp_dest_insert" ON campana_destinatarios
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "camp_dest_update" ON campana_destinatarios
  FOR UPDATE USING (auth.uid() IS NOT NULL);
