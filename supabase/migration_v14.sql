-- migration_v14: Fix foreign keys to CASCADE on patient delete
-- Problema: evoluciones_clinicas, recordatorios_log, campana_destinatarios
-- bloquean DELETE de pacientes por FK con RESTRICT (default)

-- 1. evoluciones_clinicas.paciente_id: RESTRICT → CASCADE
ALTER TABLE evoluciones_clinicas
  DROP CONSTRAINT evoluciones_clinicas_paciente_id_fkey,
  ADD CONSTRAINT evoluciones_clinicas_paciente_id_fkey
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;

-- 2. evoluciones_clinicas.paciente_id en schema original (redundant check)
-- Already handled above

-- 3. recordatorios_log.paciente_id: default RESTRICT → CASCADE
ALTER TABLE recordatorios_log
  DROP CONSTRAINT recordatorios_log_paciente_id_fkey,
  ADD CONSTRAINT recordatorios_log_paciente_id_fkey
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;

-- 4. campana_destinatarios.paciente_id: default RESTRICT → CASCADE
ALTER TABLE campana_destinatarios
  DROP CONSTRAINT campana_destinatarios_paciente_id_fkey,
  ADD CONSTRAINT campana_destinatarios_paciente_id_fkey
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;
