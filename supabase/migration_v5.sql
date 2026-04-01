-- ============================================================
-- Migration v5: Add filiation fields to pacientes table
-- ============================================================

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS religion          TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil      TEXT,
  ADD COLUMN IF NOT EXISTS grado_instruccion TEXT,
  ADD COLUMN IF NOT EXISTS procedencia       TEXT;
