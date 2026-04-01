-- ============================================================
-- Migration v3: Formulario médico completo en historia clínica
-- Basado en plantilla clínica Dra. Dennisse Arroyo
-- ============================================================

ALTER TABLE historias_clinicas
  -- Signos vitales
  ADD COLUMN IF NOT EXISTS fc                       TEXT,           -- Frecuencia cardíaca
  ADD COLUMN IF NOT EXISTS fr                       TEXT,           -- Frecuencia respiratoria
  ADD COLUMN IF NOT EXISTS pa                       TEXT,           -- Presión arterial
  ADD COLUMN IF NOT EXISTS imc                      TEXT,           -- Índice de masa corporal
  ADD COLUMN IF NOT EXISTS rq                       TEXT,
  ADD COLUMN IF NOT EXISTS asa                      TEXT,

  -- Filiación adicional
  ADD COLUMN IF NOT EXISTS religion                 TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil             TEXT,
  ADD COLUMN IF NOT EXISTS grado_instruccion        TEXT,
  ADD COLUMN IF NOT EXISTS procedencia              TEXT,

  -- Anamnesis
  ADD COLUMN IF NOT EXISTS tiempo_enfermedad        TEXT,

  -- Antecedentes fisiológicos
  ADD COLUMN IF NOT EXISTS gestacion_g              TEXT,
  ADD COLUMN IF NOT EXISTS gestacion_p              TEXT,
  ADD COLUMN IF NOT EXISTS menarquia                TEXT,
  ADD COLUMN IF NOT EXISTS fur_historia             TEXT,
  ADD COLUMN IF NOT EXISTS rc                       TEXT,
  ADD COLUMN IF NOT EXISTS apetito                  TEXT,
  ADD COLUMN IF NOT EXISTS sed                      TEXT,
  ADD COLUMN IF NOT EXISTS diuresis                 TEXT,
  ADD COLUMN IF NOT EXISTS deposiciones             TEXT,
  ADD COLUMN IF NOT EXISTS peso_kg                  TEXT,
  ADD COLUMN IF NOT EXISTS talla                    TEXT,
  ADD COLUMN IF NOT EXISTS sueno                    TEXT,
  ADD COLUMN IF NOT EXISTS ultima_ingesta           TEXT,
  ADD COLUMN IF NOT EXISTS alcohol                  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tabaco                   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS drogas                   BOOLEAN DEFAULT FALSE,

  -- Antecedentes patológicos (checkboxes)
  ADD COLUMN IF NOT EXISTS ant_patologicos          TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ant_patologicos_otros    TEXT,

  -- Alergias medicamentosas (checkboxes)
  ADD COLUMN IF NOT EXISTS alergias_medicamentos    TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alergias_med_otros       TEXT,

  -- Fármacos actuales (checkboxes)
  ADD COLUMN IF NOT EXISTS farmacos_lista           TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS farmacos_otros           TEXT,

  -- Antecedentes quirúrgicos y familiares
  ADD COLUMN IF NOT EXISTS ant_quirurgicos          TEXT,
  ADD COLUMN IF NOT EXISTS ant_familiares           TEXT;
