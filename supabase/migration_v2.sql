-- =============================================================
-- MIGRACIÓN V2: Sistema Completo de Gestión + Auto-Renovaciones
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. AMPLIAR tratamientos_catalogo
-- ─────────────────────────────────────────────────────────────
ALTER TABLE tratamientos_catalogo
  ADD COLUMN IF NOT EXISTS duracion_vigencia_meses      INT,
  ADD COLUMN IF NOT EXISTS intervalo_recordatorio_dias  INT,
  ADD COLUMN IF NOT EXISTS sesiones_por_ciclo           INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS es_permanente                BOOLEAN DEFAULT FALSE;

-- Reemplazar constraint de categoría con las 8 nuevas + evaluacion + otro
ALTER TABLE tratamientos_catalogo
  DROP CONSTRAINT IF EXISTS tratamientos_catalogo_categoria_check;

ALTER TABLE tratamientos_catalogo
  ADD CONSTRAINT tratamientos_catalogo_categoria_check
  CHECK (categoria IN (
    'hilos_dermosustentacion', 'bioestimuladores', 'acido_hialuronico',
    'toxina_botulinica', 'perfilamiento_rostro', 'endolifting_corporal',
    'aparatologia', 'procedimientos_piel', 'evaluacion', 'otro'
  ));

-- ─────────────────────────────────────────────────────────────
-- 2. AMPLIAR evoluciones_clinicas con campos del historial
-- ─────────────────────────────────────────────────────────────
ALTER TABLE evoluciones_clinicas
  ADD COLUMN IF NOT EXISTS signos_sintomas     TEXT,
  ADD COLUMN IF NOT EXISTS fur                 DATE,        -- Fecha Última Regla
  ADD COLUMN IF NOT EXISTS ram                 TEXT,        -- Reacciones Adversas Médicas
  ADD COLUMN IF NOT EXISTS antecedentes        TEXT,
  ADD COLUMN IF NOT EXISTS examenes_auxiliares TEXT,
  ADD COLUMN IF NOT EXISTS medicacion          TEXT;

-- ─────────────────────────────────────────────────────────────
-- 3. NUEVA TABLA: procedimientos_consulta
--    Vincula cada sesión con uno o más tratamientos del catálogo
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedimientos_consulta (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evolucion_id   UUID NOT NULL REFERENCES evoluciones_clinicas(id) ON DELETE CASCADE,
  tratamiento_id UUID NOT NULL REFERENCES tratamientos_catalogo(id),
  notas          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proc_consulta_evolucion
  ON procedimientos_consulta(evolucion_id);

-- ─────────────────────────────────────────────────────────────
-- 4. NUEVA TABLA: seguimientos_renovacion
--    Registro de vigencia por cada procedimiento aplicado
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seguimientos_renovacion (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id               UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tratamiento_id            UUID NOT NULL REFERENCES tratamientos_catalogo(id),
  evolucion_id              UUID REFERENCES evoluciones_clinicas(id),
  procedimiento_consulta_id UUID REFERENCES procedimientos_consulta(id),
  fecha_realizacion         DATE NOT NULL,
  fecha_vencimiento         DATE,   -- NULL = permanente
  estado                    TEXT DEFAULT 'vigente' CHECK (estado IN (
                              'vigente', 'proximo_vencer', 'vencido', 'renovado', 'permanente'
                            )),
  recordatorios_enviados    INT DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seguimientos_paciente
  ON seguimientos_renovacion(paciente_id);
CREATE INDEX IF NOT EXISTS idx_seguimientos_vencimiento
  ON seguimientos_renovacion(fecha_vencimiento);

CREATE TRIGGER trg_seguimientos_updated_at
  BEFORE UPDATE ON seguimientos_renovacion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5. NUEVA TABLA: recordatorios_log
--    Registro de mensajes WhatsApp programados y enviados
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recordatorios_log (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seguimiento_id           UUID NOT NULL REFERENCES seguimientos_renovacion(id) ON DELETE CASCADE,
  paciente_id              UUID NOT NULL REFERENCES pacientes(id),
  tipo                     TEXT NOT NULL CHECK (tipo IN ('30_dias', '7_dias', 'vencimiento')),
  mensaje_enviado          TEXT,
  estado                   TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'fallido')),
  chatwoot_conversation_id TEXT,
  fecha_programada         DATE NOT NULL,
  fecha_enviada            TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha_estado
  ON recordatorios_log(fecha_programada, estado);

-- ─────────────────────────────────────────────────────────────
-- 6. TRIGGER: Auto-crear seguimiento al registrar procedimiento
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION crear_seguimiento_renovacion()
RETURNS TRIGGER AS $$
DECLARE
  v_tratamiento  tratamientos_catalogo%ROWTYPE;
  v_evolucion    evoluciones_clinicas%ROWTYPE;
  fecha_venc     DATE;
BEGIN
  SELECT * INTO v_tratamiento FROM tratamientos_catalogo WHERE id = NEW.tratamiento_id;
  SELECT * INTO v_evolucion   FROM evoluciones_clinicas   WHERE id = NEW.evolucion_id;

  -- Calcular fecha de vencimiento según la lógica del tratamiento
  IF v_tratamiento.es_permanente THEN
    fecha_venc := NULL;
  ELSIF v_tratamiento.intervalo_recordatorio_dias IS NOT NULL THEN
    fecha_venc := DATE(v_evolucion.fecha_atencion) + v_tratamiento.intervalo_recordatorio_dias;
  ELSIF v_tratamiento.duracion_vigencia_meses IS NOT NULL THEN
    fecha_venc := (DATE(v_evolucion.fecha_atencion)
                  + (v_tratamiento.duracion_vigencia_meses || ' months')::INTERVAL)::DATE;
  ELSE
    fecha_venc := NULL;
  END IF;

  INSERT INTO seguimientos_renovacion (
    paciente_id, tratamiento_id, evolucion_id,
    procedimiento_consulta_id, fecha_realizacion, fecha_vencimiento, estado
  ) VALUES (
    v_evolucion.paciente_id, NEW.tratamiento_id, NEW.evolucion_id,
    NEW.id, DATE(v_evolucion.fecha_atencion), fecha_venc,
    CASE WHEN fecha_venc IS NULL THEN 'permanente' ELSE 'vigente' END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_crear_seguimiento
  AFTER INSERT ON procedimientos_consulta
  FOR EACH ROW EXECUTE FUNCTION crear_seguimiento_renovacion();

-- ─────────────────────────────────────────────────────────────
-- 7. TRIGGER: Auto-crear recordatorios WhatsApp al crear seguimiento
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION crear_recordatorios_whatsapp()
RETURNS TRIGGER AS $$
BEGIN
  -- Tratamientos permanentes no generan recordatorios
  IF NEW.fecha_vencimiento IS NULL THEN
    RETURN NEW;
  END IF;

  -- 30 días antes (solo si aún no ha pasado)
  IF (NEW.fecha_vencimiento - INTERVAL '30 days')::DATE > CURRENT_DATE THEN
    INSERT INTO recordatorios_log (seguimiento_id, paciente_id, tipo, fecha_programada)
    VALUES (NEW.id, NEW.paciente_id, '30_dias',
            (NEW.fecha_vencimiento - INTERVAL '30 days')::DATE);
  END IF;

  -- 7 días antes
  IF (NEW.fecha_vencimiento - INTERVAL '7 days')::DATE > CURRENT_DATE THEN
    INSERT INTO recordatorios_log (seguimiento_id, paciente_id, tipo, fecha_programada)
    VALUES (NEW.id, NEW.paciente_id, '7_dias',
            (NEW.fecha_vencimiento - INTERVAL '7 days')::DATE);
  END IF;

  -- Día del vencimiento
  INSERT INTO recordatorios_log (seguimiento_id, paciente_id, tipo, fecha_programada)
  VALUES (NEW.id, NEW.paciente_id, 'vencimiento', NEW.fecha_vencimiento);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_crear_recordatorios
  AFTER INSERT ON seguimientos_renovacion
  FOR EACH ROW EXECUTE FUNCTION crear_recordatorios_whatsapp();

-- ─────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY para nuevas tablas
-- ─────────────────────────────────────────────────────────────
ALTER TABLE procedimientos_consulta  ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimientos_renovacion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordatorios_log        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proc_consulta_select" ON procedimientos_consulta
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "proc_consulta_insert" ON procedimientos_consulta
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "proc_consulta_delete" ON procedimientos_consulta
  FOR DELETE USING (get_my_role() IN ('admin', 'doctor'));

CREATE POLICY "seguimientos_select" ON seguimientos_renovacion
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "seguimientos_insert" ON seguimientos_renovacion
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "seguimientos_update" ON seguimientos_renovacion
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "recordatorios_select" ON recordatorios_log
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "recordatorios_insert" ON recordatorios_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "recordatorios_update" ON recordatorios_log
  FOR UPDATE USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 9. VISTA: renovaciones_vista (para el módulo de renovaciones)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW renovaciones_vista AS
SELECT
  sr.id,
  sr.paciente_id,
  p.nombres || ' ' || p.apellidos   AS paciente_nombre,
  p.telefono                         AS paciente_telefono,
  tc.nombre                          AS tratamiento_nombre,
  tc.categoria,
  tc.es_permanente,
  sr.fecha_realizacion,
  sr.fecha_vencimiento,
  sr.recordatorios_enviados,
  CASE
    WHEN sr.fecha_vencimiento IS NULL                                          THEN 'permanente'
    WHEN sr.fecha_vencimiento < CURRENT_DATE                                   THEN 'vencido'
    WHEN sr.fecha_vencimiento <= (CURRENT_DATE + INTERVAL '30 days')::DATE     THEN 'proximo_vencer'
    ELSE 'vigente'
  END                                AS estado_actual,
  (sr.fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer
FROM  seguimientos_renovacion sr
JOIN  pacientes             p   ON p.id  = sr.paciente_id
JOIN  tratamientos_catalogo tc  ON tc.id = sr.tratamiento_id
ORDER BY sr.fecha_vencimiento ASC NULLS LAST;

-- ─────────────────────────────────────────────────────────────
-- 10. CATÁLOGO COMPLETO: 52 procedimientos de la Dra. Dennisse
-- ─────────────────────────────────────────────────────────────
TRUNCATE tratamientos_catalogo CASCADE;

INSERT INTO tratamientos_catalogo
  (nombre, codigo, categoria, duracion_minutos, duracion_vigencia_meses,
   intervalo_recordatorio_dias, sesiones_por_ciclo, es_permanente,
   requiere_evaluacion_previa, descripcion)
VALUES

-- ── HILOS DE DERMOSUSTENTACIÓN ──────────────────────────────
('Hilos Delta Lifting®',          'HDL-001', 'hilos_dermosustentacion', 90, 24,   NULL, 1, FALSE, TRUE,  'Hilo tensor de última generación para lifting facial'),
('Hilos Clásicos',                'HCL-001', 'hilos_dermosustentacion', 60, 24,   NULL, 1, FALSE, TRUE,  'Hilos tensores clásicos para reafirmación facial'),
('Hilos Delta',                   'HDL-002', 'hilos_dermosustentacion', 60, 24,   NULL, 1, FALSE, TRUE,  'Hilos delta para levantamiento facial'),
('Hilos Korean Lifting',          'HKL-001', 'hilos_dermosustentacion', 60, 6,    NULL, 1, FALSE, TRUE,  'Técnica coreana de levantamiento con hilos'),
('Hilos Brazilian Tensage',       'HBT-001', 'hilos_dermosustentacion', 60, 6,    NULL, 1, FALSE, TRUE,  'Técnica brasileña de tensión con hilos bioestimuladores'),
('Hilos de Relleno',              'HRE-001', 'hilos_dermosustentacion', 45, 6,    NULL, 1, FALSE, TRUE,  'Hilos con efecto relleno para restauración de volumen'),
('Hilos de Bioestimulación',      'HBO-001', 'hilos_dermosustentacion', 45, 6,    NULL, 1, FALSE, FALSE, 'Hilos para estimulación de colágeno'),
('Hilos Levantamiento de Mirada', 'HLM-001', 'hilos_dermosustentacion', 60, 6,    NULL, 1, FALSE, TRUE,  'Hilos especializados para el contorno ocular'),

-- ── BIOESTIMULADORES ─────────────────────────────────────────
('Profhilo',        'PRF-001', 'bioestimuladores', 45, NULL, 120, 3, FALSE, FALSE, 'Bioestimulador con AH de ultra alta concentración — mín. 3 sesiones/año'),
('Jalupro',         'JAL-001', 'bioestimuladores', 45, NULL, 120, 3, FALSE, FALSE, 'Bioestimulador a base de aminoácidos y AH — mín. 3 sesiones/año'),
('Facetem',         'FCT-001', 'bioestimuladores', 45, 12,  NULL, 1, FALSE, FALSE, 'Bioestimulador de nueva generación'),
('Nucleofill',      'NUC-001', 'bioestimuladores', 45, 12,  NULL, 1, FALSE, FALSE, 'Polinucleótidos bioestimuladores para regeneración celular'),
('Toskani',         'TOS-001', 'bioestimuladores', 45, NULL, 120, 3, FALSE, FALSE, 'Cocktail de bioestimulación Toskani — mín. 3 sesiones/año'),
('PB Serum',        'PBS-001', 'bioestimuladores', 30, 6,   NULL, 1, FALSE, FALSE, 'Suero bioestimulador de plasmaféresis — cada 6 meses'),
('Exosoma Capilar', 'EXC-001', 'bioestimuladores', 45, NULL, 120, 3, FALSE, FALSE, 'Tratamiento capilar con exosomas regenerativos — mín. 3 sesiones/año'),

-- ── ÁCIDO HIALURÓNICO ────────────────────────────────────────
('Facemodeling',        'AHF-001',  'acido_hialuronico', 45, 12, NULL, 1, FALSE, FALSE, 'Modelado facial con ácido hialurónico'),
('Dubai Technique',     'AHD-001',  'acido_hialuronico', 60, 12, NULL, 1, FALSE, FALSE, 'Técnica dubai de armonización facial con AH'),
('Rinomodelación',      'AHR-001',  'acido_hialuronico', 30, 12, NULL, 1, FALSE, TRUE,  'Corrección no quirúrgica del contorno nasal'),
('Mentón',              'AHM-001',  'acido_hialuronico', 30, 12, NULL, 1, FALSE, FALSE, 'Proyección y definición del mentón con AH'),
('Marcación Mandibular','AHJ-001',  'acido_hialuronico', 45, 12, NULL, 1, FALSE, FALSE, 'Definición del ángulo mandibular'),
('Ojeras',              'AHO-001',  'acido_hialuronico', 30, 12, NULL, 1, FALSE, FALSE, 'Relleno y corrección del surco nasoyugal'),
('Temporales',          'AHT-001',  'acido_hialuronico', 30, 12, NULL, 1, FALSE, FALSE, 'Voluminización de la región temporal'),
('Código de Barras',    'AHC-001',  'acido_hialuronico', 30, 12, NULL, 1, FALSE, FALSE, 'Corrección de líneas peribucales verticales'),
('Labios',              'AHL-001',  'acido_hialuronico', 30, 12, NULL, 1, FALSE, FALSE, 'Relleno y definición labial con AH'),
('Líneas de Marioneta', 'AHLM-001', 'acido_hialuronico', 30, 12, NULL, 1, FALSE, FALSE, 'Corrección de surcos labiomandibulares'),
('Glúteos con AH',      'AHG-001',  'acido_hialuronico', 90, 24, NULL, 1, FALSE, TRUE,  'Voluminización y modelado de glúteos con AH'),

-- ── TOXINA BOTULÍNICA ────────────────────────────────────────
('Entrecejo',   'BOT-001', 'toxina_botulinica', 30, 6, NULL, 1, FALSE, FALSE, 'Neuromodulación de líneas de entrecejo'),
('Frente',      'BOT-002', 'toxina_botulinica', 30, 6, NULL, 1, FALSE, FALSE, 'Neuromodulación de líneas horizontales de frente'),
('Patas de Gallo','BOT-003','toxina_botulinica', 30, 6, NULL, 1, FALSE, FALSE, 'Neuromodulación de líneas periorbitales'),
('Nefertiti',   'BOT-004', 'toxina_botulinica', 30, 6, NULL, 1, FALSE, FALSE, 'Lifting cervical no quirúrgico con toxina'),
('Bruxismo',    'BOT-005', 'toxina_botulinica', 30, 6, NULL, 1, FALSE, FALSE, 'Tratamiento del bruxismo con neuromodulador'),
('Babybotox',   'BOT-006', 'toxina_botulinica', 30, 6, NULL, 1, FALSE, FALSE, 'Técnica de microdosis de toxina botulínica'),

-- ── PERFILAMIENTO DE ROSTRO ──────────────────────────────────
('Minilipo HD Papada',       'PER-001', 'perfilamiento_rostro', 120, 36,  NULL, 1, TRUE,  TRUE,  'Liposucción HD para contorno facial — permanente, control a los 3 años'),
('Endolifting Láser Facial', 'PER-002', 'perfilamiento_rostro', 90,  96,  NULL, 1, FALSE, TRUE,  'Lifting facial con láser endoscópico — duración 8 años'),
('Nanofat',                  'PER-003', 'perfilamiento_rostro', 60,  NULL,NULL, 1, TRUE,  TRUE,  'Transferencia de grasa nanofiltrada — resultado permanente'),

-- ── ENDOLIFTING LÁSER CORPORAL ───────────────────────────────
('Endolifting Brazos',   'ELC-001', 'endolifting_corporal', 90,  60, NULL, 1, FALSE, TRUE, 'Reafirmación con láser de la zona de los brazos'),
('Endolifting Piernas',  'ELC-002', 'endolifting_corporal', 90,  60, NULL, 1, FALSE, TRUE, 'Reafirmación con láser de la zona de las piernas'),
('Endolifting Abdomen',  'ELC-003', 'endolifting_corporal', 120, 60, NULL, 1, FALSE, TRUE, 'Reafirmación con láser de la zona abdominal'),
('Aumento de Glúteos',   'ELC-004', 'endolifting_corporal', 90,  24, NULL, 1, FALSE, TRUE, 'Aumento y modelado de glúteos con técnica láser'),

-- ── APARATOLOGÍA ─────────────────────────────────────────────
('Morpheus 8',                       'APA-001', 'aparatologia', 60, NULL, 120, 3, FALSE, FALSE, 'Radiofrecuencia fraccionada con microaguja Morpheus 8 — mín. 3/año'),
('Hollywood Peel',                   'APA-002', 'aparatologia', 45, NULL, 120, 3, FALSE, FALSE, 'Peeling láser carbono para luminosidad y textura — mín. 3/año'),
('Radiofrecuencia',                  'APA-003', 'aparatologia', 60, NULL, 120, 3, FALSE, FALSE, 'Tratamiento de reafirmación con radiofrecuencia — mín. 3/año'),
('Láser CO2',                        'APA-004', 'aparatologia', 60, NULL, 120, 3, FALSE, TRUE,  'Láser de CO2 ablativo para resurfacing y cicatrices — mín. 3/año'),
('Hidratación con Bioestimuladores', 'APA-005', 'aparatologia', 45, NULL, 120, 3, FALSE, FALSE, 'Sesión combinada de hidratación con bioestimuladores — mín. 3/año'),
('Subsición + Bioestimuladores',     'APA-006', 'aparatologia', 60, NULL, 120, 3, FALSE, TRUE,  'Técnica de subsición combinada con bioestimuladores — mín. 3/año'),
('Lentigos Solares',                 'APA-007', 'aparatologia', 45, NULL, 120, 3, FALSE, FALSE, 'Tratamiento de manchas lenticulares por láser — mín. 3/año'),
('Verrugas',                         'APA-008', 'aparatologia', 30, NULL, 120, 3, FALSE, FALSE, 'Eliminación de verrugas con láser — mín. 3/año'),
('Resurfacing',                      'APA-009', 'aparatologia', 60, NULL, 120, 3, FALSE, TRUE,  'Rejuvenecimiento superficial por láser — mín. 3/año'),
('Facetite',                         'APA-010', 'aparatologia', 90, NULL, 120, 3, FALSE, TRUE,  'Lifting facial asistido por radiofrecuencia Facetite — mín. 3/año'),

-- ── PROCEDIMIENTOS PARA LA PIEL ──────────────────────────────
('Innova Beauty con Astrodome', 'PPI-001', 'procedimientos_piel', 45, NULL,  60, 6, FALSE, FALSE, 'Tratamiento con tecnología Innova Beauty y Astrodome — cada 2 meses'),
('Exosomas',                    'PPE-001', 'procedimientos_piel', 45, NULL, 120, 3, FALSE, FALSE, 'Tratamiento regenerativo con exosomas — mín. 3 sesiones/año'),
('Peeling ZK',                  'PPZ-001', 'procedimientos_piel', 45, NULL, 120, 3, FALSE, FALSE, 'Peeling químico ZK para renovación celular — mín. 3 sesiones/año');
