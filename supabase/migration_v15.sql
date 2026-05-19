-- migration_v15.sql — Nivel de paciente y nivel de atencion
-- Requerido por Magali (marketing) para segmentar campanas

-- Nivel de paciente: semaforo verde/amarillo/rojo
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS nivel_paciente TEXT DEFAULT 'verde'
  CHECK (nivel_paciente IN ('verde', 'amarillo', 'rojo'));

-- Nivel de atencion: normal / precaucion / no_contactar
-- "no_contactar" = pacientes problematicas que NUNCA deben recibir campanas
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS nivel_atencion TEXT DEFAULT 'normal'
  CHECK (nivel_atencion IN ('normal', 'precaucion', 'no_contactar'));
