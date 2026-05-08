-- =============================================================
-- MIGRACION V12: Tracking de respuestas WA + cooldown anti-spam
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- =============================================================

-- 1. Agregar estado "respondido" al check constraint
ALTER TABLE recordatorios_log
  DROP CONSTRAINT IF EXISTS recordatorios_log_estado_check;

ALTER TABLE recordatorios_log
  ADD CONSTRAINT recordatorios_log_estado_check
  CHECK (estado IN ('pendiente', 'enviado', 'fallido', 'respondido'));

-- 2. Agregar columna para timestamp de respuesta del paciente
ALTER TABLE recordatorios_log
  ADD COLUMN IF NOT EXISTS respondio_at TIMESTAMPTZ;

-- 3. Indice para buscar recordatorios recientes por paciente (cooldown)
CREATE INDEX IF NOT EXISTS idx_recordatorios_paciente_estado
  ON recordatorios_log(paciente_id, estado, fecha_enviada);

-- 4. Indice para buscar por conversation_id (webhook lookup)
CREATE INDEX IF NOT EXISTS idx_recordatorios_conversation
  ON recordatorios_log(chatwoot_conversation_id)
  WHERE chatwoot_conversation_id IS NOT NULL;
